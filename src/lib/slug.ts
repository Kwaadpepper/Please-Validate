/**
 * Génère un slug URL-safe propre à partir d'une chaîne arbitraire.
 * Gère les accents français, ligatures, apostrophes et ponctuation.
 */
export function slugify(input: unknown): string {
  if (input === null || input === undefined) return '';
  const str = String(input);

  return str
    .trim()
    .toLowerCase()
    // Remplacement explicite des ligatures courantes
    .replace(/œ/g, 'oe')
    .replace(/æ/g, 'ae')
    // Décomposition Unicode des accents (NFD)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    // Remplacement des apostrophes et guillemets par un séparateur
    .replace(/['’`"]/g, '-')
    // Remplacement de tout caractère non alphanumérique par un tiret
    .replace(/[^a-z0-9]/g, '-')
    // Remplacement des tirets multiples par un seul
    .replace(/-+/g, '-')
    // Suppression des tirets en début et fin
    .replace(/^-+|-+$/g, '');
}
