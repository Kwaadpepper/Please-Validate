import { describe, it, expect } from 'vitest';
import { encodeTemplateToHash, decodeTemplateFromHash, exportPleaseFile, parsePleaseFile } from '../codec';
import { DEFAULT_DEMO_TEMPLATE } from '../presets';
import type { PleaseTemplate } from '../types';

describe('codec URL Hash', () => {
  it('encodes and decodes template symmetrically via hash', () => {
    const hash = encodeTemplateToHash(DEFAULT_DEMO_TEMPLATE);
    expect(hash.startsWith('v1.')).toBe(true);

    const decoded = decodeTemplateFromHash(hash);
    expect(decoded).not.toBeNull();
    expect(decoded?.name).toBe(DEFAULT_DEMO_TEMPLATE.name);
    expect(decoded?.fields.length).toBe(DEFAULT_DEMO_TEMPLATE.fields.length);
  });

  it('handles prefixes like # or #p= when decoding', () => {
    const rawHash = encodeTemplateToHash(DEFAULT_DEMO_TEMPLATE);
    const withP = `#p=${rawHash}`;
    const decoded = decodeTemplateFromHash(withP);
    expect(decoded?.name).toBe(DEFAULT_DEMO_TEMPLATE.name);
  });

  it('returns null on invalid hash or wrong version', () => {
    expect(decodeTemplateFromHash('v2.inconnu')).toBeNull();
    expect(decodeTemplateFromHash('random_string')).toBeNull();
  });
});

describe('codec .please file', () => {
  it('exports and parses .please file correctly', () => {
    const { filename, content } = exportPleaseFile(DEFAULT_DEMO_TEMPLATE);
    expect(filename).toBe('articles-de-blog-fiches-cms-v1.please');

    const parsed = parsePleaseFile(content);
    expect(parsed.id).toBe(DEFAULT_DEMO_TEMPLATE.id);
    expect(parsed.name).toBe(DEFAULT_DEMO_TEMPLATE.name);
    expect(parsed.schemaVersion).toBe(1);
  });

  it('rejects malformed .please files', () => {
    expect(() => parsePleaseFile('{ not valid json')).toThrow(/JSON valide/);
    expect(() => parsePleaseFile(JSON.stringify({ schemaVersion: 2, name: 'Test' }))).toThrow(/format attendu/);
  });
});
