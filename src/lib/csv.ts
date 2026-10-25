import type { FieldDefinition, PleaseTemplate, RowData, RowValue } from './types';
import { slugify } from './slug';

export interface CsvOptions {
  delimiter?: ',' | ';';
  withBom?: boolean;
}

/**
 * Détecte automatiquement le délimiteur le plus probable (',' ou ';')
 * en analysant la première ligne d'un texte CSV.
 */
export function detectCsvDelimiter(csvText: string): ',' | ';' {
  // Trouver la première ligne non vide
  const firstLine = csvText.replace(/^\uFEFF/, '').split(/\r\n|\n|\r/)[0] || '';
  const commaCount = (firstLine.match(/,/g) || []).length;
  const semicolonCount = (firstLine.match(/;/g) || []).length;

  return semicolonCount > commaCount ? ';' : ',';
}

/**
 * Échappe une valeur pour une cellule CSV selon RFC 4180.
 */
export function escapeCsvCell(val: unknown, delimiter: ',' | ';'): string {
  if (val === null || val === undefined) return '';

  const str = String(val);
  const needsQuotes =
    str.includes(delimiter) ||
    str.includes('"') ||
    str.includes('\n') ||
    str.includes('\r') ||
    str.startsWith(' ') ||
    str.endsWith(' ');

  if (needsQuotes) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Sérialise un jeu de données en CSV RFC 4180 avec BOM UTF-8.
 */
export function serializeToCsv(
  template: PleaseTemplate,
  rows: RowData[],
  options: CsvOptions = {}
): string {
  const delimiter = options.delimiter || ',';
  const withBom = options.withBom ?? true;

  const headers = template.fields.map((f) => f.key);
  const headerLine = headers.map((h) => escapeCsvCell(h, delimiter)).join(delimiter);

  const lines: string[] = [headerLine];

  for (const row of rows) {
    const rowCells: string[] = [];

    for (const field of template.fields) {
      let rawVal = row[field.key];

      // Si le champ est un slug et qu'il est vide, on le calcule depuis le champ source
      if (field.type === 'slug' && field.sourceFieldKey && (rawVal === undefined || rawVal === null || rawVal === '')) {
        rawVal = slugify(row[field.sourceFieldKey]);
      }

      // Formatage selon le type
      if (rawVal === null || rawVal === undefined) {
        rowCells.push('');
      } else if (field.type === 'boolean') {
        rowCells.push(escapeCsvCell(rawVal ? 'true' : 'false', delimiter));
      } else if (field.type === 'multiselect') {
        const arr = Array.isArray(rawVal) ? rawVal : [String(rawVal)];
        rowCells.push(escapeCsvCell(JSON.stringify(arr), delimiter));
      } else {
        rowCells.push(escapeCsvCell(String(rawVal), delimiter));
      }
    }

    lines.push(rowCells.join(delimiter));
  }

  const csvContent = lines.join('\r\n');
  return withBom ? `\uFEFF${csvContent}` : csvContent;
}

/**
 * Parseur d'état complet RFC 4180.
 * Gère correctement les cellules contenant des retours à la ligne et des guillemets doublés.
 */
export function parseRawCsvGrid(csvText: string, delimiter?: ',' | ';'): string[][] {
  const clean = csvText.replace(/^\uFEFF/, '');
  const delim = delimiter || detectCsvDelimiter(clean);

  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentCell = '';
  let insideQuotes = false;

  for (let i = 0; i < clean.length; i++) {
    const char = clean[i];
    const nextChar = clean[i + 1];

    if (insideQuotes) {
      if (char === '"') {
        if (nextChar === '"') {
          // Guillemet échappé ("")
          currentCell += '"';
          i++;
        } else {
          // Fin de la cellule entre guillemets
          insideQuotes = false;
        }
      } else {
        currentCell += char;
      }
    } else {
      if (char === '"') {
        insideQuotes = true;
      } else if (char === delim) {
        currentRow.push(currentCell);
        currentCell = '';
      } else if (char === '\r') {
        if (nextChar === '\n') {
          i++; // Consommer le \n du CRLF
        }
        currentRow.push(currentCell);
        currentCell = '';
        rows.push(currentRow);
        currentRow = [];
      } else if (char === '\n') {
        currentRow.push(currentCell);
        currentCell = '';
        rows.push(currentRow);
        currentRow = [];
      } else {
        currentCell += char;
      }
    }
  }

  // Dernière cellule si non vide ou si la ligne contenait des délimiteurs
  if (currentCell !== '' || currentRow.length > 0) {
    currentRow.push(currentCell);
    rows.push(currentRow);
  }

  // Filtrer les lignes totalement vides en fin de fichier
  return rows.filter((r) => r.length > 1 || (r.length === 1 && r[0].trim() !== ''));
}

/**
 * Désérialise un fichier CSV selon le gabarit de données.
 */
export function parseFromCsv(
  csvText: string,
  template: PleaseTemplate,
  delimiter?: ',' | ';'
): { rows: RowData[]; warnings: string[]; matchedHeaders: string[] } {
  const grid = parseRawCsvGrid(csvText, delimiter);
  const warnings: string[] = [];

  if (grid.length === 0) {
    return { rows: [], warnings: ['Le fichier CSV est vide.'], matchedHeaders: [] };
  }

  const rawHeaders = grid[0].map((h) => h.trim());
  const fieldKeyMap: Record<number, FieldDefinition> = {};
  const matchedHeaders: string[] = [];

  rawHeaders.forEach((colHeader, colIdx) => {
    // Rapprochement par key exacte ou insensible à la casse
    const field =
      template.fields.find((f) => f.key === colHeader) ||
      template.fields.find((f) => f.key.toLowerCase() === colHeader.toLowerCase()) ||
      template.fields.find((f) => f.label.toLowerCase() === colHeader.toLowerCase());

    if (field) {
      fieldKeyMap[colIdx] = field;
      matchedHeaders.push(colHeader);
    } else {
      warnings.push(`Colonne « ${colHeader} » ignorée (non présente dans le gabarit).`);
    }
  });

  const missingRequiredFields = template.fields
    .filter((f) => f.rules.required && !Object.values(fieldKeyMap).some((mapped) => mapped.key === f.key))
    .map((f) => f.label);

  if (missingRequiredFields.length > 0) {
    warnings.push(`Colonnes obligatoires absentes du CSV : ${missingRequiredFields.join(', ')}.`);
  }

  const resultRows: RowData[] = [];

  for (let r = 1; r < grid.length; r++) {
    const rawRow = grid[r];
    const rowObj: RowData = {
      _id: 'row_' + Math.random().toString(36).substring(2, 9) + Date.now().toString(36).substring(4)
    };

    // Initialiser tous les champs du gabarit avec des valeurs par défaut
    for (const field of template.fields) {
      if (field.type === 'boolean') {
        rowObj[field.key] = false;
      } else if (field.type === 'multiselect') {
        rowObj[field.key] = [];
      } else {
        rowObj[field.key] = '';
      }
    }

    // Remplir avec les colonnes présentes
    rawRow.forEach((cellVal, colIdx) => {
      const field = fieldKeyMap[colIdx];
      if (!field) return;

      const trimmed = cellVal.trim();

      if (field.type === 'boolean') {
        const lower = trimmed.toLowerCase();
        rowObj[field.key] = lower === 'true' || lower === '1' || lower === 'oui';
      } else if (field.type === 'number') {
        rowObj[field.key] = trimmed === '' ? null : Number(trimmed);
      } else if (field.type === 'multiselect') {
        if (!trimmed) {
          rowObj[field.key] = [];
        } else if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
          try {
            rowObj[field.key] = JSON.parse(trimmed);
          } catch {
            rowObj[field.key] = trimmed.split('|').map((s) => s.trim()).filter(Boolean);
          }
        } else if (trimmed.includes('|')) {
          rowObj[field.key] = trimmed.split('|').map((s) => s.trim()).filter(Boolean);
        } else {
          rowObj[field.key] = trimmed.split(',').map((s) => s.trim()).filter(Boolean);
        }
      } else {
        rowObj[field.key] = cellVal;
      }
    });

    // Recalcul automatique des champs slug liés si nécessaire
    for (const field of template.fields) {
      if (field.type === 'slug' && field.sourceFieldKey) {
        const sourceVal = rowObj[field.sourceFieldKey];
        rowObj[field.key] = slugify(sourceVal);
      }
    }

    resultRows.push(rowObj);
  }

  return { rows: resultRows, warnings, matchedHeaders };
}
