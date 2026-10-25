import { describe, it, expect } from 'vitest';
import { slugify } from '../slug';

describe('slugify', () => {
  it('converts basic text to lowercase with hyphens', () => {
    expect(slugify('Hello World')).toBe('hello-world');
  });

  it('normalizes French accents correctly', () => {
    expect(slugify('Café & Thé à la Crème brûlée')).toBe('cafe-the-a-la-creme-brulee');
    expect(slugify('Éléphant dans la forêt')).toBe('elephant-dans-la-foret');
  });

  it('handles French ligatures and apostrophes', () => {
    expect(slugify("L'œuvre d'art et le cœur")).toBe('l-oeuvre-d-art-et-le-coeur');
    expect(slugify('Curriculum vitæ')).toBe('curriculum-vitae');
  });

  it('removes non-alphanumeric punctuation and collapses dashes', () => {
    expect(slugify('Projet CMS 2026 : Super Nouveauté !')).toBe('projet-cms-2026-super-nouveaute');
    expect(slugify('---test---slug---')).toBe('test-slug');
  });

  it('handles null, undefined and empty string', () => {
    expect(slugify('')).toBe('');
    expect(slugify(null)).toBe('');
    expect(slugify(undefined)).toBe('');
  });
});
