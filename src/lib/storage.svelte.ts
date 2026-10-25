import type { PleaseTemplate, RowData, RowValidationSummary } from './types';
import { DEFAULT_DEMO_TEMPLATE } from './presets';
import { encodeTemplateToHash, decodeTemplateFromHash } from './codec';
import { validateAllRows, validateRow } from './validator';
import { slugify } from './slug';
import { parseFromCsv } from './csv';

const STORAGE_TEMPLATES_KEY = 'please_validate_templates_v1';
const STORAGE_CURRENT_TPL_ID_KEY = 'please_validate_current_tpl_id';

export interface CsvImportReport {
  rowsCount: number;
  warnings: string[];
  matchedHeaders: string[];
  totalValid: number;
  totalInvalid: number;
}

export function getNextDuplicateTitle(original: string): string {
  if (!original) return '';
  // Repère si le titre se termine déjà par une ou plusieurs mentions (copie) ou (copie N)
  const match = original.match(/^(.*?)(?:\s*\(copie(?:\s+(\d+))?\))+$/i);
  if (match) {
    const base = match[1].trim();
    const lastNumberMatch = original.match(/\(copie(?:\s+(\d+))?\)$/i);
    const count = lastNumberMatch && lastNumberMatch[1] ? parseInt(lastNumberMatch[1], 10) + 1 : 2;
    return `${base} (copie ${count})`;
  }
  return `${original} (copie)`;
}

class AppState {
  currentTemplate = $state<PleaseTemplate>(DEFAULT_DEMO_TEMPLATE);
  templatesLibrary = $state<PleaseTemplate[]>([DEFAULT_DEMO_TEMPLATE]);
  viewMode = $state<'filler' | 'builder'>('filler');
  rows = $state<RowData[]>([]);
  selectedRowId = $state<string | null>(null);
  filterStatus = $state<'all' | 'valid' | 'invalid'>('all');
  searchTerm = $state<string>('');
  toastMessage = $state<string | null>(null);
  toastType = $state<'info' | 'success' | 'warning' | 'error'>('info');

  // Rapport d'import CSV
  lastImportReport = $state<CsvImportReport | null>(null);
  isImportReportModalOpen = $state(false);

  private toastTimeout: ReturnType<typeof setTimeout> | null = null;

  // Dérivés de validation
  validation = $derived(validateAllRows(this.currentTemplate, this.rows));

  selectedRow = $derived(
    this.rows.find((r) => r._id === this.selectedRowId) || this.rows[0] || null
  );

  selectedRowSummary = $derived<RowValidationSummary | null>(
    this.selectedRow
      ? validateRow(this.currentTemplate, this.selectedRow, this.rows.indexOf(this.selectedRow) + 1)
      : null
  );

  currentRowIndex = $derived(
    this.selectedRow ? this.rows.indexOf(this.selectedRow) : 0
  );

  canSelectPreviousRow = $derived(this.currentRowIndex > 0);
  canSelectNextRow = $derived(this.currentRowIndex < this.rows.length - 1);

  selectPreviousRow() {
    if (this.canSelectPreviousRow) {
      this.selectedRowId = this.rows[this.currentRowIndex - 1]._id;
    }
  }

  selectNextRow() {
    if (this.canSelectNextRow) {
      this.selectedRowId = this.rows[this.currentRowIndex + 1]._id;
    }
  }

  filteredRows = $derived.by(() => {
    let list = this.rows;

    // Filtre par statut de validation
    if (this.filterStatus !== 'all') {
      const summaryMap = new Map(this.validation.summaries.map((s) => [s.rowId, s.isValid]));
      list = list.filter((r) => {
        const isValid = summaryMap.get(r._id) ?? false;
        return this.filterStatus === 'valid' ? isValid : !isValid;
      });
    }

    // Filtre par recherche textuelle
    if (this.searchTerm.trim() !== '') {
      const q = this.searchTerm.toLowerCase();
      list = list.filter((r) => {
        return Object.values(r).some((val) => {
          if (val === null || val === undefined) return false;
          return String(val).toLowerCase().includes(q);
        });
      });
    }

    return list;
  });

  init() {
    if (typeof window === 'undefined') return;

    // 1. Charger la bibliothèque de gabarits depuis localStorage
    try {
      const savedLibrary = localStorage.getItem(STORAGE_TEMPLATES_KEY);
      if (savedLibrary) {
        const parsed = JSON.parse(savedLibrary);
        if (Array.isArray(parsed) && parsed.length > 0) {
          this.templatesLibrary = parsed;
        }
      }
    } catch (e) {
      console.warn('Impossible de charger les gabarits sauvegardés:', e);
    }

    // 2. Vérifier si un gabarit est présent dans l'URL hash
    const hash = window.location.hash;
    let templateFromHash: PleaseTemplate | null = null;
    if (hash) {
      templateFromHash = decodeTemplateFromHash(hash);
    }

    if (templateFromHash) {
      this.currentTemplate = templateFromHash;
      this.upsertTemplateInLibrary(templateFromHash);
      this.viewMode = 'filler'; // Priorité saisie si gabarit partagé
    } else {
      // Sinon, charger le dernier gabarit utilisé ou la démo
      const lastId = localStorage.getItem(STORAGE_CURRENT_TPL_ID_KEY);
      const found = this.templatesLibrary.find((t) => t.id === lastId);
      this.currentTemplate = found || this.templatesLibrary[0] || DEFAULT_DEMO_TEMPLATE;
      this.syncUrlHash();
    }

    // 3. Charger les lignes de saisie pour ce gabarit
    this.loadRowsForCurrentTemplate();

    // 4. Écouter les changements de hash dans l'URL
    window.addEventListener('hashchange', () => {
      const newHash = window.location.hash;
      const tpl = decodeTemplateFromHash(newHash);
      if (tpl && tpl.id !== this.currentTemplate.id) {
        this.selectTemplate(tpl, false);
      }
    });
  }

  showToast(message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') {
    this.toastMessage = message;
    this.toastType = type;
    if (this.toastTimeout) clearTimeout(this.toastTimeout);
    this.toastTimeout = setTimeout(() => {
      this.toastMessage = null;
    }, 3500);
  }

  syncUrlHash() {
    if (typeof window === 'undefined') return;
    try {
      const hashStr = encodeTemplateToHash(this.currentTemplate);
      const isFileProtocol =
        window.location.protocol === 'file:' ||
        !window.location.origin ||
        window.location.origin === 'null';

      if (isFileProtocol) {
        // En mode file://, modifier uniquement le hash sans toucher à window.location.pathname
        window.location.hash = `p=${hashStr}`;
      } else {
        const newUrl = `${window.location.pathname}#p=${hashStr}`;
        window.history.replaceState(null, '', newUrl);
      }
    } catch (e) {
      console.error('Erreur lors de la synchronisation de l’URL:', e);
    }
  }

  private upsertTemplateInLibrary(template: PleaseTemplate) {
    const idx = this.templatesLibrary.findIndex((t) => t.id === template.id);
    if (idx >= 0) {
      this.templatesLibrary[idx] = template;
    } else {
      this.templatesLibrary.push(template);
    }
    this.saveLibrary();
  }

  private saveLibrary() {
    if (typeof localStorage === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_TEMPLATES_KEY, JSON.stringify(this.templatesLibrary));
    } catch (e) {
      console.warn('Erreur de sauvegarde locale des gabarits:', e);
    }
  }

  selectTemplate(template: PleaseTemplate, updateHash = true) {
    this.saveRowsForCurrentTemplate();
    this.currentTemplate = template;
    this.upsertTemplateInLibrary(template);

    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_CURRENT_TPL_ID_KEY, template.id);
      } catch {}
    }

    if (updateHash) {
      this.syncUrlHash();
    }

    this.loadRowsForCurrentTemplate();
  }

  saveTemplate(updatedTemplate: PleaseTemplate) {
    this.currentTemplate = {
      ...updatedTemplate,
      updatedAt: new Date().toISOString()
    };
    this.upsertTemplateInLibrary(this.currentTemplate);
    this.syncUrlHash();
    this.showToast('Gabarit enregistré avec succès.', 'success');
  }

  deleteTemplate(templateId: string) {
    if (this.templatesLibrary.length <= 1) {
      this.showToast('Impossible de supprimer le seul gabarit restant.', 'warning');
      return;
    }

    const tplToDelete = this.templatesLibrary.find((t) => t.id === templateId);
    const deletedName = tplToDelete?.name || 'Gabarit';

    // 1. Retirer de la bibliothèque
    this.templatesLibrary = this.templatesLibrary.filter((t) => t.id !== templateId);
    this.saveLibrary();

    // 2. Nettoyer les lignes associées du localStorage
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.removeItem(this.getRowsStorageKey(templateId));
      } catch {}
    }

    // 3. Si c'était le gabarit actif, basculer vers le premier disponible
    if (this.currentTemplate.id === templateId) {
      const nextTpl = this.templatesLibrary[0];
      this.selectTemplate(nextTpl);
    }

    this.showToast(`Gabarit « ${deletedName} » supprimé de la bibliothèque locale.`, 'info');
  }

  createNewTemplate(): PleaseTemplate {
    const newTpl: PleaseTemplate = {
      schemaVersion: 1,
      id: 'tpl_' + Math.random().toString(36).substring(2, 9),
      name: 'Nouveau gabarit',
      description: '',
      updatedAt: new Date().toISOString(),
      fields: [
        {
          id: 'f_title',
          key: 'title',
          label: 'Titre',
          type: 'text',
          helpText: 'Titre principal',
          rules: { required: true, nullable: false, min: 3 }
        },
        {
          id: 'f_slug',
          key: 'slug',
          label: 'Slug URL',
          type: 'slug',
          sourceFieldKey: 'title',
          helpText: 'Calculé automatiquement',
          rules: { required: true, nullable: false }
        }
      ]
    };

    this.selectTemplate(newTpl);
    this.viewMode = 'builder';
    this.showToast('Nouveau gabarit créé.', 'info');
    return newTpl;
  }

  // Gestion des lignes (Data rows)
  private getRowsStorageKey(templateId: string): string {
    return `please_validate_rows_${templateId}`;
  }

  private loadRowsForCurrentTemplate() {
    if (typeof localStorage !== 'undefined') {
      try {
        const saved = localStorage.getItem(this.getRowsStorageKey(this.currentTemplate.id));
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            this.rows = parsed;
            this.selectedRowId = parsed[0]._id;
            return;
          }
        }
      } catch {}
    }

    // Par défaut, créer une ligne vierge avec les valeurs par défaut
    this.rows = [this.createBlankRow()];
    this.selectedRowId = this.rows[0]._id;
  }

  saveRowsForCurrentTemplate() {
    if (typeof localStorage === 'undefined') return;
    try {
      localStorage.setItem(
        this.getRowsStorageKey(this.currentTemplate.id),
        JSON.stringify(this.rows)
      );
    } catch (e) {
      console.warn('Erreur lors de la sauvegarde des lignes:', e);
    }
  }

  createBlankRow(): RowData {
    const row: RowData = {
      _id: 'row_' + Math.random().toString(36).substring(2, 9) + Date.now().toString(36).substring(4)
    };

    for (const field of this.currentTemplate.fields) {
      if (field.type === 'boolean') {
        row[field.key] = false;
      } else if (field.type === 'multiselect') {
        row[field.key] = [];
      } else {
        row[field.key] = '';
      }
    }

    return row;
  }

  addRow() {
    const newRow = this.createBlankRow();
    this.rows.push(newRow);
    this.selectedRowId = newRow._id;
    this.saveRowsForCurrentTemplate();
    this.showToast(`Ligne #${this.rows.length} ajoutée.`, 'info');
  }

  duplicateRow(rowId: string) {
    const source = this.rows.find((r) => r._id === rowId);
    if (!source) return;

    const clone: RowData = {
      ...source,
      _id: 'row_' + Math.random().toString(36).substring(2, 9) + Date.now().toString(36).substring(4)
    };

    // Si on a un champ texte / titre, appliquer l'incrémentation intelligente de copie
    for (const field of this.currentTemplate.fields) {
      if (field.type === 'text' && typeof clone[field.key] === 'string' && clone[field.key]) {
        clone[field.key] = getNextDuplicateTitle(clone[field.key]);
        break;
      }
    }

    // Recalculer les slugs
    for (const field of this.currentTemplate.fields) {
      if (field.type === 'slug' && field.sourceFieldKey) {
        clone[field.key] = slugify(clone[field.sourceFieldKey]);
      }
    }

    const idx = this.rows.findIndex((r) => r._id === rowId);
    this.rows.splice(idx + 1, 0, clone);
    this.selectedRowId = clone._id;
    this.saveRowsForCurrentTemplate();
    this.showToast('Ligne dupliquée.', 'info');
  }

  deleteRow(rowId: string) {
    if (this.rows.length <= 1) {
      // Vider simplement la dernière ligne plutôt que de laisser un tableau vide
      this.rows = [this.createBlankRow()];
      this.selectedRowId = this.rows[0]._id;
      this.saveRowsForCurrentTemplate();
      this.showToast('Ligne réinitialisée.', 'info');
      return;
    }

    const idx = this.rows.findIndex((r) => r._id === rowId);
    this.rows = this.rows.filter((r) => r._id !== rowId);

    if (this.selectedRowId === rowId) {
      const nextIdx = Math.min(idx, this.rows.length - 1);
      this.selectedRowId = this.rows[nextIdx]._id;
    }

    this.saveRowsForCurrentTemplate();
    this.showToast('Ligne supprimée.', 'info');
  }

  clearAllRows() {
    this.rows = [this.createBlankRow()];
    this.selectedRowId = this.rows[0]._id;
    this.saveRowsForCurrentTemplate();
    this.showToast('Toutes les lignes ont été réinitialisées.', 'info');
  }

  updateSelectedRowField(key: string, value: unknown) {
    if (!this.selectedRow) return;

    this.selectedRow[key] = value as any;

    // Recalculer automatiquement les slugs dépendants de cette clé
    for (const field of this.currentTemplate.fields) {
      if (field.type === 'slug' && field.sourceFieldKey === key) {
        this.selectedRow[field.key] = slugify(value);
      }
    }

    this.saveRowsForCurrentTemplate();
  }

  importCsv(csvText: string) {
    try {
      const { rows: importedRows, warnings, matchedHeaders } = parseFromCsv(csvText, this.currentTemplate);

      if (importedRows.length === 0) {
        this.showToast('Aucune ligne valide trouvée dans le CSV.', 'error');
        return;
      }

      this.rows = importedRows;
      this.selectedRowId = importedRows[0]._id;
      this.saveRowsForCurrentTemplate();

      const validation = validateAllRows(this.currentTemplate, importedRows);

      this.lastImportReport = {
        rowsCount: importedRows.length,
        warnings,
        matchedHeaders,
        totalValid: validation.totalValid,
        totalInvalid: validation.totalInvalid
      };

      // Si des warnings ou des erreurs existent, ouvrir la modale pour que l'utilisateur voie le détail
      if (warnings.length > 0 || validation.totalInvalid > 0) {
        this.isImportReportModalOpen = true;
      } else {
        this.showToast(`${importedRows.length} lignes importées avec succès (100% conformes) !`, 'success');
      }
    } catch (e: any) {
      this.showToast(`Erreur d’import CSV : ${e.message}`, 'error');
    }
  }
}

export const appState = new AppState();
