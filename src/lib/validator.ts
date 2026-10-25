import type { FieldDefinition, PleaseTemplate, RowData, RowValue, RowValidationSummary, WysiwygFormat } from './types';
import { slugify } from './slug';

/**
 * Extrait le texte brut visible d'un contenu HTML ou Markdown
 * pour évaluer les contraintes min/max de longueur éditoriale.
 */
export function extractRawText(content: unknown, format: WysiwygFormat = 'html'): string {
  if (content === null || content === undefined) return '';
  const str = String(content);

  if (format === 'html') {
    return str
      // Supprime les balises HTML <...>
      .replace(/<[^>]*>/g, ' ')
      // Décode les entités HTML courantes
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      // Normalise les espaces multiples
      .replace(/\s+/g, ' ')
      .trim();
  } else {
    // Nettoyage Markdown basique
    return str
      .replace(/!\[.*?\]\(.*?\)/g, '')         // images
      .replace(/\[(.*?)\]\(.*?\)/g, '$1')       // liens
      .replace(/`{1,3}.*?`{1,3}/g, '')          // code inline et blocs
      .replace(/[#*_\-~>]/g, ' ')               // titres, puces, gras, italique
      .replace(/\s+/g, ' ')
      .trim();
  }
}

/**
 * Valide la valeur d'un champ selon les règles définies dans le gabarit.
 * Renvoie un message d'erreur en français ou null si valide.
 */
export function validateField(
  field: FieldDefinition,
  value: RowValue,
  allRowValues?: RowData
): string | null {
  const { rules } = field;
  const isValueEmpty =
    value === null ||
    value === undefined ||
    (typeof value === 'string' && value.trim() === '') ||
    (Array.isArray(value) && value.length === 0);

  // 1. Règle Required
  if (rules.required && isValueEmpty) {
    return `Le champ « ${field.label} » est obligatoire.`;
  }

  // 2. Règle Nullable (si vide et autorisé, on court-circuite min/max)
  if (rules.nullable && isValueEmpty) {
    return null;
  }

  // Si non-required et non-nullable mais vide : si pas obligatoire, vide est accepté
  if (!rules.required && isValueEmpty) {
    return null;
  }

  // 3. Validation spécifique selon le type
  switch (field.type) {
    case 'text':
    case 'textarea': {
      const strVal = String(value ?? '');
      const len = strVal.length;

      if (rules.min !== undefined && len < rules.min) {
        return `Au moins ${rules.min} caractère${rules.min > 1 ? 's' : ''} requis (${len} actuellement).`;
      }
      if (rules.max !== undefined && len > rules.max) {
        return `Maximum ${rules.max} caractère${rules.max > 1 ? 's' : ''} autorisé${rules.max > 1 ? 's' : ''} (${len} actuellement).`;
      }
      break;
    }

    case 'wysiwyg': {
      const format = field.wysiwygFormat || 'html';
      const rawText = extractRawText(value, format);
      const len = rawText.length;

      if (rules.required && len === 0) {
        return `Le champ « ${field.label} » doit contenir du texte significatif.`;
      }
      if (rules.min !== undefined && len < rules.min) {
        return `Au moins ${rules.min} caractère${rules.min > 1 ? 's' : ''} de texte requis (${len} actuellement).`;
      }
      if (rules.max !== undefined && len > rules.max) {
        return `Maximum ${rules.max} caractère${rules.max > 1 ? 's' : ''} de texte autorisé${rules.max > 1 ? 's' : ''} (${len} actuellement).`;
      }
      break;
    }

    case 'slug': {
      const slugVal = String(value ?? '');
      // Format URL-safe : minuscules, chiffres, tirets
      const isValidSlug = /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slugVal);
      if (!isValidSlug) {
        return `Le slug « ${slugVal} » n'est pas valide (lettres minuscules, chiffres et tirets uniquement).`;
      }

      // Si le slug est lié à un champ source, vérifier la cohérence
      if (field.sourceFieldKey && allRowValues) {
        const sourceVal = allRowValues[field.sourceFieldKey];
        const expectedSlug = slugify(sourceVal);
        if (expectedSlug && slugVal !== expectedSlug) {
          return `Le slug devrait être « ${expectedSlug} » d'après le champ source.`;
        }
      }
      break;
    }

    case 'number': {
      const numVal = typeof value === 'number' ? value : Number(value);
      if (isNaN(numVal) || !isFinite(numVal)) {
        return `Une valeur numérique valide est requise.`;
      }
      if (rules.min !== undefined && numVal < rules.min) {
        return `La valeur doit être supérieure ou égale à ${rules.min}.`;
      }
      if (rules.max !== undefined && numVal > rules.max) {
        return `La valeur doit être inférieure ou égale à ${rules.max}.`;
      }
      break;
    }

    case 'boolean': {
      if (typeof value !== 'boolean') {
        const str = String(value).toLowerCase();
        if (str !== 'true' && str !== 'false' && str !== '1' && str !== '0' && str !== 'oui' && str !== 'non') {
          return `Une valeur booléenne (oui/non) est attendue.`;
        }
      }
      break;
    }

    case 'select': {
      const optVal = String(value ?? '');
      if (field.options && field.options.length > 0) {
        if (!field.options.includes(optVal)) {
          return `L'option « ${optVal} » ne fait pas partie des choix autorisés (${field.options.join(', ')}).`;
        }
      }
      break;
    }

    case 'multiselect': {
      const selectedArr = Array.isArray(value)
        ? (value as string[])
        : typeof value === 'string' && value.trim()
        ? value.split(',').map((s) => s.trim()).filter(Boolean)
        : [];

      if (field.options && field.options.length > 0) {
        const unknownOpts = selectedArr.filter((o) => !field.options!.includes(o));
        if (unknownOpts.length > 0) {
          return `Options non reconnues : ${unknownOpts.join(', ')}.`;
        }
      }

      const count = selectedArr.length;
      if (rules.min !== undefined && count < rules.min) {
        return `Sélectionnez au moins ${rules.min} choix (${count} actuellement).`;
      }
      if (rules.max !== undefined && count > rules.max) {
        return `Maximum ${rules.max} choix autorisé${rules.max > 1 ? 's' : ''} (${count} actuellement).`;
      }
      break;
    }
  }

  return null;
}

/**
 * Valide une ligne entière de données.
 */
export function validateRow(
  template: PleaseTemplate,
  row: RowData,
  rowIndex: number
): RowValidationSummary {
  const errors: Record<string, string> = {};

  for (const field of template.fields) {
    const error = validateField(field, row[field.key], row);
    if (error) {
      errors[field.key] = error;
    }
  }

  return {
    rowId: row._id,
    rowIndex,
    isValid: Object.keys(errors).length === 0,
    errors
  };
}

/**
 * Valide l'ensemble des lignes d'un tableau pour un gabarit donné.
 */
export function validateAllRows(
  template: PleaseTemplate,
  rows: RowData[]
): {
  summaries: RowValidationSummary[];
  totalValid: number;
  totalInvalid: number;
  allValid: boolean;
} {
  const summaries = rows.map((row, idx) => validateRow(template, row, idx + 1));
  const totalValid = summaries.filter((s) => s.isValid).length;
  const totalInvalid = summaries.length - totalValid;

  return {
    summaries,
    totalValid,
    totalInvalid,
    allValid: totalInvalid === 0
  };
}
