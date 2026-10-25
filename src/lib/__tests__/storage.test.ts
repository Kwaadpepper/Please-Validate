import { describe, it, expect, beforeEach } from 'vitest';
import { appState } from '../storage.svelte';
import { DEFAULT_DEMO_TEMPLATE } from '../presets';

describe('Storage and Template management', () => {
  beforeEach(() => {
    // Reset templates library
    appState.templatesLibrary = [
      DEFAULT_DEMO_TEMPLATE,
      {
        ...DEFAULT_DEMO_TEMPLATE,
        id: 'tpl_second',
        name: 'Deuxième Gabarit'
      }
    ];
    appState.currentTemplate = DEFAULT_DEMO_TEMPLATE;
  });

  it('allows creating a new template and switching to it', () => {
    const newTpl = appState.createNewTemplate();
    expect(newTpl.name).toBe('Nouveau gabarit');
    expect(appState.currentTemplate.id).toBe(newTpl.id);
    expect(appState.viewMode).toBe('builder');
  });

  it('allows deleting a template from the library', () => {
    expect(appState.templatesLibrary.length).toBe(2);
    appState.deleteTemplate('tpl_second');
    expect(appState.templatesLibrary.length).toBe(1);
    expect(appState.templatesLibrary[0].id).toBe(DEFAULT_DEMO_TEMPLATE.id);
  });

  it('switches currentTemplate when the active template is deleted', () => {
    appState.currentTemplate = appState.templatesLibrary[1]; // tpl_second
    appState.deleteTemplate('tpl_second');
    expect(appState.currentTemplate.id).toBe(DEFAULT_DEMO_TEMPLATE.id);
  });

  it('prevents deleting the last remaining template', () => {
    appState.templatesLibrary = [DEFAULT_DEMO_TEMPLATE];
    appState.deleteTemplate(DEFAULT_DEMO_TEMPLATE.id);
    expect(appState.templatesLibrary.length).toBe(1);
  });
});

describe('Smart duplicate title generation', () => {
  it('appends (copie) to clean title', async () => {
    const { getNextDuplicateTitle } = await import('../storage.svelte');
    expect(getNextDuplicateTitle('Mon Titre')).toBe('Mon Titre (copie)');
  });

  it('increments (copie) to (copie 2)', async () => {
    const { getNextDuplicateTitle } = await import('../storage.svelte');
    expect(getNextDuplicateTitle('Mon Titre (copie)')).toBe('Mon Titre (copie 2)');
  });

  it('increments (copie 2) to (copie 3)', async () => {
    const { getNextDuplicateTitle } = await import('../storage.svelte');
    expect(getNextDuplicateTitle('Mon Titre (copie 2)')).toBe('Mon Titre (copie 3)');
  });

  it('cleans up stacked (copie) (copie) properly', async () => {
    const { getNextDuplicateTitle } = await import('../storage.svelte');
    expect(getNextDuplicateTitle('Mon Titre (copie) (copie)')).toBe('Mon Titre (copie 2)');
  });
});
