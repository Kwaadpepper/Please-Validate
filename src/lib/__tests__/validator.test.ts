import { describe, it, expect } from 'vitest';
import { validateField, validateRow, extractRawText } from '../validator';
import type { FieldDefinition, PleaseTemplate, RowData } from '../types';

describe('extractRawText', () => {
  it('strips HTML tags and decodes common entities', () => {
    const html = '<p>Bonjour <strong>le monde</strong> &amp; bienvenue !</p>';
    expect(extractRawText(html, 'html')).toBe('Bonjour le monde & bienvenue !');
  });

  it('strips markdown syntax', () => {
    const md = '# Titre\n\nVoici du **gras** et un [lien](https://example.com).';
    expect(extractRawText(md, 'markdown')).toBe('Titre Voici du gras et un lien.');
  });
});

describe('validateField', () => {
  it('validates required fields', () => {
    const field: FieldDefinition = {
      id: '1',
      key: 'title',
      label: 'Titre',
      type: 'text',
      rules: { required: true, nullable: false }
    };

    expect(validateField(field, '')).toContain('obligatoire');
    expect(validateField(field, null)).toContain('obligatoire');
    expect(validateField(field, 'Mon titre')).toBeNull();
  });

  it('handles nullable rules properly when empty vs filled', () => {
    const field: FieldDefinition = {
      id: '2',
      key: 'subtitle',
      label: 'Sous-titre',
      type: 'text',
      rules: { required: false, nullable: true, min: 10, max: 50 }
    };

    // If empty, nullable bypasses min/max
    expect(validateField(field, '')).toBeNull();
    expect(validateField(field, null)).toBeNull();

    // If filled, min/max must be respected
    expect(validateField(field, 'Court')).toContain('Au moins 10 caractères');
    expect(validateField(field, 'Un sous-titre parfaitement calibré')).toBeNull();
  });

  it('validates SEO min and max length on text and textarea', () => {
    const seoTitleField: FieldDefinition = {
      id: '3',
      key: 'seo_title',
      label: 'Titre SEO',
      type: 'text',
      rules: { required: true, nullable: false, min: 50, max: 60 }
    };

    // 40 chars
    expect(validateField(seoTitleField, 'Court titre SEO pour le test de validation')).toContain('Au moins 50 caractères requis (42 actuellement)');
    // 55 chars
    expect(validateField(seoTitleField, 'Titre SEO de taille idéale pour Google et notre moteur!')).toBeNull();
    // 65 chars
    expect(validateField(seoTitleField, 'Ce titre SEO est beaucoup trop long pour satisfaire les critères Google SERP!')).toContain('Maximum 60 caractères autorisés');
  });

  it('validates WYSIWYG raw text length', () => {
    const wysiwygField: FieldDefinition = {
      id: '4',
      key: 'content',
      label: 'Description',
      type: 'wysiwyg',
      wysiwygFormat: 'html',
      rules: { required: true, nullable: false, min: 10 }
    };

    // Only empty tags
    expect(validateField(wysiwygField, '<p></p><p><br></p>')).toContain('texte significatif');
    // Content with tags
    expect(validateField(wysiwygField, '<p>Court</p>')).toContain('Au moins 10 caractères');
    expect(validateField(wysiwygField, '<p>Voici un contenu HTML valide.</p>')).toBeNull();
  });

  it('validates slug format and synchronization with source field', () => {
    const slugField: FieldDefinition = {
      id: '5',
      key: 'slug',
      label: 'Slug',
      type: 'slug',
      sourceFieldKey: 'title',
      rules: { required: true, nullable: false }
    };

    const row: RowData = {
      _id: 'r1',
      title: 'Mon Premier Article !',
      slug: 'mon-premier-article'
    };

    expect(validateField(slugField, 'mon-premier-article', row)).toBeNull();
    expect(validateField(slugField, 'invalide/slug', row)).toContain("n'est pas valide");
    expect(validateField(slugField, 'autre-slug', row)).toContain('devrait être « mon-premier-article »');
  });

  it('validates multiselect count and options', () => {
    const tagField: FieldDefinition = {
      id: '6',
      key: 'tags',
      label: 'Tags',
      type: 'multiselect',
      options: ['Tech', 'Design', 'News'],
      rules: { required: true, nullable: false, min: 1, max: 2 }
    };

    expect(validateField(tagField, [])).toContain('obligatoire');
    expect(validateField(tagField, ['Tech', 'Design'])).toBeNull();
    expect(validateField(tagField, ['Tech', 'Design', 'News'])).toContain('Maximum 2 choix');
    expect(validateField(tagField, ['Inconnu'])).toContain('Options non reconnues');
  });
});

describe('validateRow', () => {
  it('summarizes errors across an entire row', () => {
    const tpl: PleaseTemplate = {
      schemaVersion: 1,
      id: 'test_tpl',
      name: 'Test Template',
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
          key: 'count',
          label: 'Nombre',
          type: 'number',
          rules: { required: true, nullable: false, min: 5 }
        }
      ]
    };

    const validRow: RowData = { _id: 'r1', title: 'Hello', count: 10 };
    expect(validateRow(tpl, validRow, 1).isValid).toBe(true);

    const invalidRow: RowData = { _id: 'r2', title: '', count: 2 };
    const summary = validateRow(tpl, invalidRow, 2);
    expect(summary.isValid).toBe(false);
    expect(summary.errors.title).toBeDefined();
    expect(summary.errors.count).toBeDefined();
  });
});
