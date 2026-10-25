import { describe, it, expect } from 'vitest';
import { serializeToCsv, parseFromCsv, detectCsvDelimiter, parseRawCsvGrid } from '../csv';
import type { PleaseTemplate, RowData } from '../types';

const sampleTemplate: PleaseTemplate = {
  schemaVersion: 1,
  id: 'tpl_csv_test',
  name: 'Test CSV Template',
  updatedAt: '2026-10-25T12:00:00Z',
  fields: [
    {
      id: 'f1',
      key: 'title',
      label: 'Titre',
      type: 'text',
      rules: { required: true, nullable: false }
    },
    {
      id: 'f2',
      key: 'slug',
      label: 'Slug',
      type: 'slug',
      sourceFieldKey: 'title',
      rules: { required: true, nullable: false }
    },
    {
      id: 'f3',
      key: 'content',
      label: 'Contenu',
      type: 'wysiwyg',
      wysiwygFormat: 'html',
      rules: { required: true, nullable: false }
    },
    {
      id: 'f4',
      key: 'tags',
      label: 'Tags',
      type: 'multiselect',
      options: ['Tech', 'News', 'Design'],
      rules: { required: false, nullable: true }
    },
    {
      id: 'f5',
      key: 'is_active',
      label: 'Actif',
      type: 'boolean',
      rules: { required: true, nullable: false }
    }
  ]
};

describe('CSV Parser and Serializer', () => {
  it('detects comma vs semicolon delimiters', () => {
    expect(detectCsvDelimiter('title,slug,content')).toBe(',');
    expect(detectCsvDelimiter('title;slug;content')).toBe(';');
  });

  it('parses cells with embedded newlines and quotes correctly (RFC 4180)', () => {
    const rawCsv = 'title,content\r\n"Un titre","Ligne 1\nLigne 2 avec ""guillemets"""\r\n"Deuxième ligne","Texte normal"';
    const grid = parseRawCsvGrid(rawCsv, ',');

    expect(grid.length).toBe(3);
    expect(grid[1][0]).toBe('Un titre');
    expect(grid[1][1]).toBe('Ligne 1\nLigne 2 avec "guillemets"');
    expect(grid[2][0]).toBe('Deuxième ligne');
  });

  it('serializes and deserializes data with full fidelity (round-trip)', () => {
    const originalRows: RowData[] = [
      {
        _id: '1',
        title: 'Café & Éclair',
        slug: 'cafe-eclair',
        content: '<p>Superbe café,\navec un retour à la ligne et des "quotes" !</p>',
        tags: ['Tech', 'Design'],
        is_active: true
      },
      {
        _id: '2',
        title: 'Deuxième Article',
        slug: 'deuxieme-article',
        content: 'Simple description',
        tags: ['News'],
        is_active: false
      }
    ];

    const csvOutput = serializeToCsv(sampleTemplate, originalRows, { delimiter: ',', withBom: true });
    expect(csvOutput.startsWith('\uFEFF')).toBe(true);

    const { rows: parsedRows, warnings } = parseFromCsv(csvOutput, sampleTemplate);
    expect(warnings.length).toBe(0);
    expect(parsedRows.length).toBe(2);

    expect(parsedRows[0].title).toBe('Café & Éclair');
    expect(parsedRows[0].slug).toBe('cafe-eclair');
    expect(parsedRows[0].content).toBe('<p>Superbe café,\navec un retour à la ligne et des "quotes" !</p>');
    expect(parsedRows[0].tags).toEqual(['Tech', 'Design']);
    expect(parsedRows[0].is_active).toBe(true);

    expect(parsedRows[1].title).toBe('Deuxième Article');
    expect(parsedRows[1].is_active).toBe(false);
  });

  it('recalculates slug on import if source field changes', () => {
    const csv = 'title,slug,content,tags,is_active\r\nNouveau Titre Frais,ancien-slug,Contenu,[],true';
    const { rows } = parseFromCsv(csv, sampleTemplate);

    expect(rows.length).toBe(1);
    expect(rows[0].title).toBe('Nouveau Titre Frais');
    // Slug is automatically synchronized with source field 'title'
    expect(rows[0].slug).toBe('nouveau-titre-frais');
  });
});
