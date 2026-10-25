import LZString from 'lz-string';
import type { PleaseTemplate, FieldDefinition } from './types';
import { slugify } from './slug';

const HASH_PREFIX = 'v1.';

/**
 * Valide sommairement qu'un objet inconnu correspond bien à la structure d'un PleaseTemplate.
 */
export function validateTemplateStructure(obj: unknown): obj is PleaseTemplate {
  if (!obj || typeof obj !== 'object') return false;
  const candidate = obj as Record<string, unknown>;

  if (candidate.schemaVersion !== 1) return false;
  if (typeof candidate.name !== 'string' || candidate.name.trim() === '') return false;
  if (!Array.isArray(candidate.fields)) return false;

  for (const field of candidate.fields as FieldDefinition[]) {
    if (!field || typeof field !== 'object') return false;
    if (typeof field.key !== 'string' || field.key.trim() === '') return false;
    if (typeof field.label !== 'string' || field.label.trim() === '') return false;
    if (!field.type || typeof field.type !== 'string') return false;
    if (!field.rules || typeof field.rules !== 'object') return false;
  }

  return true;
}

/**
 * Encode un gabarit dans une chaîne compressée utilisable dans l'URL (hash).
 */
export function encodeTemplateToHash(template: PleaseTemplate): string {
  if (!validateTemplateStructure(template)) {
    throw new Error('Le gabarit à encoder est invalide.');
  }

  const jsonStr = JSON.stringify(template);
  const compressed = LZString.compressToEncodedURIComponent(jsonStr);
  return `${HASH_PREFIX}${compressed}`;
}

/**
 * Décode un hash d'URL en gabarit PleaseTemplate.
 */
export function decodeTemplateFromHash(hash: string): PleaseTemplate | null {
  if (!hash) return null;

  // Nettoyage des éventuels préfixes # ou #p=
  let cleanHash = hash;
  if (cleanHash.startsWith('#')) cleanHash = cleanHash.substring(1);
  if (cleanHash.startsWith('p=')) cleanHash = cleanHash.substring(2);

  if (!cleanHash.startsWith(HASH_PREFIX)) {
    return null;
  }

  const payload = cleanHash.substring(HASH_PREFIX.length);
  try {
    const decompressed = LZString.decompressFromEncodedURIComponent(payload);
    if (!decompressed) return null;

    const parsed = JSON.parse(decompressed);
    if (validateTemplateStructure(parsed)) {
      return parsed;
    }
  } catch (err) {
    console.error('Erreur lors du décodage du gabarit depuis l’URL:', err);
  }

  return null;
}

/**
 * Prépare les données pour télécharger un fichier .please (JSON versionné).
 */
export function exportPleaseFile(template: PleaseTemplate): { filename: string; content: string } {
  if (!validateTemplateStructure(template)) {
    throw new Error('Impossible d’exporter un gabarit non valide.');
  }

  const baseName = slugify(template.name) || 'gabarit';
  const filename = `${baseName}-v1.please`;
  const content = JSON.stringify(template, null, 2);

  return { filename, content };
}

/**
 * Parse et valide le contenu textuel d'un fichier .please importé.
 */
export function parsePleaseFile(fileContent: string): PleaseTemplate {
  let parsed: unknown;
  try {
    parsed = JSON.parse(fileContent);
  } catch {
    throw new Error('Le fichier .please sélectionné n’est pas un fichier JSON valide.');
  }

  if (!validateTemplateStructure(parsed)) {
    throw new Error('Le fichier ne respecte pas le format attendu pour un gabarit Please Validate (schemaVersion: 1 et nom requis).');
  }

  return parsed;
}
