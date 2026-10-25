<script lang="ts">
  import { appState } from '../lib/storage.svelte';
  import WysiwygInput from './WysiwygInput.svelte';
  import CsvExportModal from './CsvExportModal.svelte';
  import { FIELD_TYPE_METAS, type FieldDefinition, type RowData } from '../lib/types';

  let isCsvExportOpen = $state(false);
  let csvFileInputEl: HTMLInputElement | null = $state(null);
  let touchedFields = $state<Record<string, boolean>>({});

  // Réinitialiser les champs touchés quand on change de ligne
  $effect(() => {
    if (appState.selectedRowId) {
      touchedFields = {};
    }
  });

  function markFieldTouched(fieldKey: string) {
    touchedFields = { ...touchedFields, [fieldKey]: true };
  }

  // Détection des types de champs pour l'organisation
  let isSeoField = (f: FieldDefinition) =>
    f.key === 'seo_title' ||
    f.key === 'seo_description' ||
    f.key.startsWith('seo_') ||
    f.label.toLowerCase().includes('seo');

  let seoFields = $derived(
    appState.currentTemplate.fields.filter(isSeoField)
  );

  let slugField = $derived(
    appState.currentTemplate.fields.find((f) => f.type === 'slug')
  );

  let titleField = $derived(
    appState.currentTemplate.fields.find(
      (f) =>
        f.key === 'title' ||
        f.key === 'titre' ||
        (f.type === 'text' && f.label.toLowerCase().includes('titre') && !isSeoField(f))
    ) || appState.currentTemplate.fields.find((f) => f.type === 'text' && !isSeoField(f))
  );

  let wysiwygFields = $derived(
    appState.currentTemplate.fields.filter((f) => f.type === 'wysiwyg')
  );

  // Autres champs généraux (excluant titre principal, slug lié, wysiwyg et SEO)
  // On place d'abord les champs compacts (select, boolean, number, short text) pour qu'ils s'associent en grille 2 colonnes
  let generalFields = $derived(
    appState.currentTemplate.fields
      .filter((f) => {
        if (isSeoField(f)) return false;
        if (f.type === 'wysiwyg') return false;
        if (f.id === slugField?.id && titleField) return false;
        if (f.id === titleField?.id) return false;
        return true;
      })
      .sort((a, b) => {
        const isFullA = a.type === 'textarea' || a.type === 'multiselect';
        const isFullB = b.type === 'textarea' || b.type === 'multiselect';
        if (isFullA === isFullB) return 0;
        return isFullA ? 1 : -1; // Les champs compacts en premier
      })
  );

  let seoTitleField = $derived(
    appState.currentTemplate.fields.find(
      (f) => f.key === 'seo_title' || f.key.toLowerCase().includes('seo_tit') || f.label.toLowerCase().includes('titre seo')
    )
  );

  let seoDescField = $derived(
    appState.currentTemplate.fields.find(
      (f) => f.key === 'seo_description' || f.key.toLowerCase().includes('seo_desc') || f.label.toLowerCase().includes('meta desc')
    )
  );

  function getRowPrimaryTitle(row: RowData): string {
    for (const field of appState.currentTemplate.fields) {
      if ((field.type === 'text' || field.type === 'textarea') && row[field.key]) {
        return String(row[field.key]);
      }
    }
    return 'Entrée sans titre';
  }

  function getRowSubtitle(row: RowData): string {
    const slug = slugField ? String(row[slugField.key] || '') : '';
    if (slug) return `/${slug}`;
    return '';
  }

  function handleCsvFileSelect(e: Event) {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const text = reader.result as string;
      appState.importCsv(text);
    };
    reader.readAsText(file);
    input.value = '';
  }

  function handleConfirmClear() {
    if (confirm('Voulez-vous vraiment vider toutes les lignes de saisie ? Cette action est irréversible.')) {
      appState.clearAllRows();
    }
  }

  function toggleMultiSelectOption(fieldKey: string, option: string) {
    if (!appState.selectedRow) return;
    const current = (appState.selectedRow[fieldKey] as string[]) || [];
    let updated: string[];
    if (current.includes(option)) {
      updated = current.filter((o) => o !== option);
    } else {
      updated = [...current, option];
    }
    appState.updateSelectedRowField(fieldKey, updated);
    markFieldTouched(fieldKey);
  }

  // Vérifier si une erreur doit être visible (évite d'agresser l'utilisateur dès le chargement)
  function shouldShowError(fieldKey: string, val: unknown, errorMsg?: string): boolean {
    if (!errorMsg) return false;
    // Si le champ a été touché (blur ou saisie)
    if (touchedFields[fieldKey]) return true;
    // Si une valeur a été saisie mais n'est pas conforme
    if (val !== null && val !== undefined && val !== '' && !(Array.isArray(val) && val.length === 0)) {
      return true;
    }
    return false;
  }
</script>

<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
  <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
    <!-- COLONNE GAUCHE (4 cols) : Gestion de la collection d'entrées & CSV -->
    <div class="lg:col-span-4 space-y-4">
      <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-2xs space-y-3.5">
        <!-- 1. En-tête de la liste + Bouton Nouvelle ligne -->
        <div class="flex items-center justify-between gap-2">
          <div class="flex items-center gap-2">
            <h2 class="text-sm font-extrabold text-slate-900 dark:text-white tracking-tight">
              Entrées
            </h2>
            <span class="px-2 py-0.5 rounded-full text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
              {appState.rows.length}
            </span>
          </div>

          <button
            type="button"
            onclick={() => appState.addRow()}
            title="Ajouter une nouvelle ligne"
            aria-label="Ajouter une nouvelle ligne"
            class="h-8 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition cursor-pointer focus-visible:ring-2 focus-visible:ring-indigo-500"
          >
            <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
            </svg>
            <span>Ajouter</span>
          </button>
        </div>

        <!-- 2. Recherche & Filtres -->
        <div class="space-y-2">
          <div class="relative">
            <input
              id="search-entries-input"
              type="text"
              bind:value={appState.searchTerm}
              placeholder="Rechercher dans les entrées..."
              aria-label="Rechercher dans les entrées"
              class="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl pl-8 pr-7 py-1.5 text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
            />
            <svg class="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            {#if appState.searchTerm}
              <button
                type="button"
                onclick={() => (appState.searchTerm = '')}
                class="absolute right-2 top-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs font-bold cursor-pointer"
                title="Effacer la recherche"
                aria-label="Effacer la recherche"
              >
                ×
              </button>
            {/if}
          </div>

          <!-- Filtres compacts (Segmented) -->
          <div class="grid grid-cols-3 gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-[11px]" role="radiogroup" aria-label="Filtrer les entrées">
            <button
              type="button"
              role="radio"
              aria-checked={appState.filterStatus === 'all'}
              onclick={() => (appState.filterStatus = 'all')}
              class="py-1 rounded-lg font-medium transition text-center cursor-pointer focus-visible:ring-2 focus-visible:ring-indigo-500
                {appState.filterStatus === 'all'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs font-bold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}"
            >
              Toutes ({appState.rows.length})
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={appState.filterStatus === 'invalid'}
              onclick={() => (appState.filterStatus = 'invalid')}
              class="py-1 rounded-lg font-medium transition text-center flex items-center justify-center gap-1 cursor-pointer focus-visible:ring-2 focus-visible:ring-indigo-500
                {appState.filterStatus === 'invalid'
                  ? 'bg-white dark:bg-slate-900 text-amber-600 dark:text-amber-400 shadow-2xs font-bold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}"
            >
              <span>À corriger</span>
              {#if appState.validation.totalInvalid > 0}
                <span class="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
              {/if}
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={appState.filterStatus === 'valid'}
              onclick={() => (appState.filterStatus = 'valid')}
              class="py-1 rounded-lg font-medium transition text-center flex items-center justify-center gap-1 cursor-pointer focus-visible:ring-2 focus-visible:ring-indigo-500
                {appState.filterStatus === 'valid'
                  ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-2xs font-bold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}"
            >
              <span>Valides</span>
              <span class="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">({appState.validation.totalValid})</span>
            </button>
          </div>
        </div>

        <!-- 3. Liste scrollable des entrées -->
        <div class="space-y-1.5 max-h-[calc(100vh-320px)] min-h-[160px] overflow-y-auto pr-0.5">
          {#if appState.filteredRows.length === 0}
            <div class="p-6 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-500 space-y-2">
              <p>Aucune entrée ne correspond aux filtres.</p>
              <button
                type="button"
                onclick={() => {
                  appState.filterStatus = 'all';
                  appState.searchTerm = '';
                }}
                class="text-indigo-600 dark:text-indigo-400 underline font-medium cursor-pointer"
              >
                Réinitialiser les filtres
              </button>
            </div>
          {/if}

          {#each appState.filteredRows as row (row._id)}
            {@const summary = appState.validation.summaries.find((s) => s.rowId === row._id)}
            {@const isSelected = appState.selectedRowId === row._id}
            {@const errorCount = summary ? Object.keys(summary.errors).length : 0}
            {@const rowIndex = appState.rows.indexOf(row) + 1}

            <div
              role="button"
              tabindex="0"
              aria-label={`Entrée #${rowIndex}: ${getRowPrimaryTitle(row)}`}
              aria-current={isSelected ? 'true' : undefined}
              onclick={() => (appState.selectedRowId = row._id)}
              onkeydown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  appState.selectedRowId = row._id;
                }
              }}
              class="group p-2.5 rounded-xl border text-left transition relative cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500
                {isSelected
                  ? 'bg-indigo-50/70 dark:bg-indigo-950/40 border-indigo-500 dark:border-indigo-500 ring-2 ring-indigo-500/20 shadow-xs'
                  : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'}"
            >
              <div class="flex items-center justify-between gap-2">
                <div class="flex items-center gap-2 min-w-0">
                  <span class="text-[11px] font-mono font-bold text-slate-400 shrink-0">
                    #{rowIndex}
                  </span>
                  <h3 class="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                    {getRowPrimaryTitle(row)}
                  </h3>
                </div>

                <!-- Badge statut discret -->
                {#if summary?.isValid}
                  <span class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/60 shrink-0">
                    ✓ Prêt
                  </span>
                {:else}
                  <span class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800/60 shrink-0">
                    {errorCount} {errorCount > 1 ? 'règles' : 'règle'}
                  </span>
                {/if}
              </div>

              <!-- Slug ou URL aperçu -->
              {#if getRowSubtitle(row)}
                <p class="text-[11px] font-mono text-slate-500 dark:text-slate-400 mt-0.5 truncate pl-5">
                  {getRowSubtitle(row)}
                </p>
              {/if}

              <!-- Actions rapides discrètes au survol -->
              <div class="mt-1.5 pt-1 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-end gap-1 opacity-40 group-hover:opacity-100 transition">
                <button
                  type="button"
                  onclick={(e) => {
                    e.stopPropagation();
                    appState.duplicateRow(row._id);
                  }}
                  title="Dupliquer cette entrée"
                  aria-label={`Dupliquer l'entrée #${rowIndex}`}
                  class="p-1 text-slate-400 hover:text-indigo-600 rounded transition cursor-pointer"
                >
                  <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </button>
                <button
                  type="button"
                  onclick={(e) => {
                    e.stopPropagation();
                    appState.deleteRow(row._id);
                  }}
                  title="Supprimer cette entrée"
                  aria-label={`Supprimer l'entrée #${rowIndex}`}
                  class="p-1 text-slate-400 hover:text-rose-600 rounded transition cursor-pointer"
                >
                  <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
          {/each}
        </div>

        <!-- 4. Barre Actions CSV Dockée (Import, Export, Rapport, Vider) -->
        <div class="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
          <!-- Bouton Export CSV Principal -->
          <button
            type="button"
            onclick={() => (isCsvExportOpen = true)}
            title="Exporter l'ensemble des données au format CSV compatible CMS"
            class="w-full h-9 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 shadow-xs transition cursor-pointer focus-visible:ring-2 focus-visible:ring-emerald-500"
          >
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            <span>Exporter en CSV</span>
            <span class="px-1.5 py-0.2 rounded bg-emerald-700 text-[10px] font-mono">
              {appState.rows.length}
            </span>
          </button>

          <!-- Boutons secondaires : Importer & Vider & Rapport -->
          <div class="flex items-center gap-1.5">
            <button
              type="button"
              onclick={() => csvFileInputEl?.click()}
              title="Importer un fichier CSV existant"
              class="flex-1 h-8 px-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-medium flex items-center justify-center gap-1.5 transition cursor-pointer focus-visible:ring-2 focus-visible:ring-indigo-500"
            >
              <svg class="w-3.5 h-3.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              <span>Importer CSV</span>
            </button>
            <input
              bind:this={csvFileInputEl}
              type="file"
              accept=".csv,text/csv"
              onchange={handleCsvFileSelect}
              class="hidden"
            />

            {#if appState.lastImportReport}
              <button
                type="button"
                onclick={() => (appState.isImportReportModalOpen = true)}
                title="Consulter le rapport d'importation CSV"
                class="h-8 px-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-medium flex items-center gap-1 transition cursor-pointer focus-visible:ring-2 focus-visible:ring-indigo-500"
              >
                <svg class="w-3.5 h-3.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span class="hidden sm:inline">Rapport</span>
                {#if appState.lastImportReport.warnings.length > 0}
                  <span class="w-2 h-2 rounded-full bg-amber-500"></span>
                {/if}
              </button>
            {/if}

            <button
              type="button"
              onclick={handleConfirmClear}
              title="Vider toutes les lignes"
              class="h-8 w-8 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 flex items-center justify-center transition shrink-0 cursor-pointer focus-visible:ring-2 focus-visible:ring-rose-500"
              aria-label="Vider toutes les lignes"
            >
              <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- COLONNE DROITE (8 cols) : Éditeur de la ligne active -->
    <div class="lg:col-span-8 space-y-4">
      {#if appState.selectedRow}
        {@const selectedIdx = appState.rows.indexOf(appState.selectedRow) + 1}
        {@const rowSummary = appState.selectedRowSummary}
        {@const errorCount = Object.keys(rowSummary?.errors || {}).length}

        <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-2xs space-y-6">
          <!-- 1. En-tête de l'éditeur avec Paging, Statut et Actions -->
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
            <!-- Gauche : Titre et conformité globale -->
            <div class="flex items-center gap-3 min-w-0 flex-1">
              <span class="px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-mono text-xs font-bold shrink-0">
                Ligne #{selectedIdx}
              </span>
              <div class="min-w-0 flex-1">
                <h1 class="text-base font-extrabold text-slate-900 dark:text-white tracking-tight truncate" title={getRowPrimaryTitle(appState.selectedRow)}>
                  {getRowPrimaryTitle(appState.selectedRow)}
                </h1>
                <div class="flex items-center gap-2 mt-0.5">
                  {#if rowSummary?.isValid}
                    <span class="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                      <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                      </svg>
                      <span>Conforme pour export CMS</span>
                    </span>
                  {:else}
                    <span class="inline-flex items-center gap-1 text-[11px] font-medium text-amber-600 dark:text-amber-400">
                      <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      <span>{errorCount} règle{errorCount > 1 ? 's' : ''} à respecter</span>
                    </span>
                  {/if}
                </div>
              </div>
            </div>

            <!-- Droite : Navigation rapide entre lignes & actions -->
            <div class="flex items-center gap-1.5 shrink-0 self-start sm:self-center">
              <!-- Paging Précédent / Suivant -->
              <div class="flex items-center bg-slate-100 dark:bg-slate-800 rounded-xl p-0.5 text-xs font-medium">
                <button
                  type="button"
                  disabled={!appState.canSelectPreviousRow}
                  onclick={() => appState.selectPreviousRow()}
                  title="Ligne précédente"
                  aria-label="Ligne précédente"
                  class="p-1.5 rounded-lg hover:bg-white dark:hover:bg-slate-700 disabled:opacity-30 disabled:hover:bg-transparent transition text-slate-700 dark:text-slate-300 cursor-pointer disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-indigo-500"
                >
                  <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <span class="px-2 text-[11px] font-mono text-slate-500 dark:text-slate-400">
                  {selectedIdx}/{appState.rows.length}
                </span>
                <button
                  type="button"
                  disabled={!appState.canSelectNextRow}
                  onclick={() => appState.selectNextRow()}
                  title="Ligne suivante"
                  aria-label="Ligne suivante"
                  class="p-1.5 rounded-lg hover:bg-white dark:hover:bg-slate-700 disabled:opacity-30 disabled:hover:bg-transparent transition text-slate-700 dark:text-slate-300 cursor-pointer disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-indigo-500"
                >
                  <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>

              <!-- Dupliquer -->
              <button
                type="button"
                onclick={() => appState.duplicateRow(appState.selectedRow!._id)}
                title="Dupliquer cette ligne"
                aria-label="Dupliquer cette ligne"
                class="h-8 px-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 font-medium flex items-center gap-1 transition cursor-pointer focus-visible:ring-2 focus-visible:ring-indigo-500"
              >
                <svg class="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                <span class="hidden sm:inline">Dupliquer</span>
              </button>

              <!-- Supprimer -->
              <button
                type="button"
                onclick={() => appState.deleteRow(appState.selectedRow!._id)}
                title="Supprimer cette ligne"
                aria-label="Supprimer cette ligne"
                class="h-8 px-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 font-medium flex items-center gap-1 transition cursor-pointer focus-visible:ring-2 focus-visible:ring-rose-500"
              >
                <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                <span class="hidden sm:inline">Supprimer</span>
              </button>
            </div>
          </div>

          <form class="space-y-6" onsubmit={(e) => e.preventDefault()}>
            <!-- 2. Zone Titre & Slug unifié (au sommet du formulaire) -->
            {#if titleField}
              {@const titleVal = appState.selectedRow[titleField.key]}
              {@const titleError = rowSummary?.errors[titleField.key]}
              {@const isTitleErrorShown = shouldShowError(titleField.key, titleVal, titleError)}
              {@const titleLen = String(titleVal ?? '').length}

              <div class="space-y-2">
                <div class="flex items-center justify-between text-xs">
                  <label for={`input-${titleField.id}`} class="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <span>{FIELD_TYPE_METAS[titleField.type]?.emoji || '📝'}</span>
                    <span>{titleField.label}</span>
                    {#if titleField.rules.required}
                      <span class="text-rose-500 font-bold" aria-hidden="true">*</span>
                      <span class="sr-only"> (obligatoire)</span>
                    {/if}
                  </label>

                  {#if titleField.rules.min !== undefined || titleField.rules.max !== undefined}
                    <span class="text-[11px] font-mono {titleLen < (titleField.rules.min ?? 0) ? (titleLen > 0 ? 'text-amber-600 dark:text-amber-400 font-semibold' : 'text-slate-400') : titleField.rules.max && titleLen > titleField.rules.max ? 'text-rose-600 dark:text-rose-400 font-semibold' : 'text-emerald-600 dark:text-emerald-400 font-semibold'}">
                      {titleLen} {titleField.rules.min !== undefined ? `/ min ${titleField.rules.min}` : ''} {titleField.rules.max !== undefined ? `(max ${titleField.rules.max})` : ''}
                    </span>
                  {/if}
                </div>

                <input
                  id={`input-${titleField.id}`}
                  type="text"
                  value={titleVal as string ?? ''}
                  oninput={(e) => {
                    appState.updateSelectedRowField(titleField.key, (e.target as HTMLInputElement).value);
                    markFieldTouched(titleField.key);
                  }}
                  onblur={() => markFieldTouched(titleField.key)}
                  placeholder={titleField.helpText || `Ex: Comment bien rédiger vos contenus...`}
                  aria-required={titleField.rules.required ? 'true' : undefined}
                  aria-invalid={isTitleErrorShown ? 'true' : 'false'}
                  aria-describedby={isTitleErrorShown ? `error-${titleField.id}${titleField.helpText ? ` help-${titleField.id}` : ''}` : (titleField.helpText ? `help-${titleField.id}` : undefined)}
                  class="w-full px-4 py-2.5 rounded-xl border text-base font-semibold bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition focus:outline-none focus:ring-2 focus:ring-indigo-500
                    {isTitleErrorShown ? 'border-rose-400 focus:ring-rose-400 bg-rose-50/20' : 'border-slate-300 dark:border-slate-700'}"
                />

                {#if isTitleErrorShown}
                  <p id={`error-${titleField.id}`} role="alert" class="text-xs text-rose-600 dark:text-rose-400 font-medium animate-in fade-in flex items-center gap-1">
                    <span aria-hidden="true">⚠</span>
                    <span>{titleError}</span>
                  </p>
                {/if}

                <!-- Slug URL auto-généré sous le titre -->
                {#if slugField}
                  {@const slugVal = String(appState.selectedRow[slugField.key] || '')}
                  <div class="flex items-center gap-2 p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 text-xs font-mono text-slate-600 dark:text-slate-400 min-w-0 overflow-hidden">
                    <span class="text-slate-400 font-sans font-medium text-[11px] shrink-0 flex items-center gap-1">
                      <svg class="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                      <span>URL :</span>
                    </span>
                    <span class="text-slate-400 shrink-0 font-sans">https://monsite.fr/</span>
                    <span class="font-bold text-indigo-600 dark:text-indigo-400 truncate min-w-0" title={slugVal}>
                      {slugVal || 'mon-slug'}
                    </span>
                    <span class="ml-auto text-[10px] font-sans text-slate-400 shrink-0 hidden sm:inline">
                      (auto-dérivé)
                    </span>
                  </div>
                {/if}
              </div>
            {/if}

            <!-- 3. Métadonnées & Champs secondaires (Grille 2 colonnes aérée) -->
            {#if generalFields.length > 0}
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                {#each generalFields as field (field.id)}
                  {@const val = appState.selectedRow[field.key]}
                  {@const fieldError = rowSummary?.errors[field.key]}
                  {@const isErrorShown = shouldShowError(field.key, val, fieldError)}
                  {@const isRequired = field.rules.required}
                  {@const isNullable = field.rules.nullable}
                  {@const isSpanFull = field.type === 'textarea' || field.type === 'multiselect'}

                  <div class="space-y-1.5 {isSpanFull ? 'md:col-span-2' : ''}">
                    <div class="flex items-center justify-between text-xs">
                      <label for={`input-${field.id}`} class="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                        <span>{FIELD_TYPE_METAS[field.type]?.emoji || '📝'}</span>
                        <span>{field.label}</span>
                        {#if isRequired}
                          <span class="text-rose-500 font-bold" title="Obligatoire">*</span>
                        {:else if isNullable}
                          <span class="text-slate-400 font-normal text-[11px]">(optionnel)</span>
                        {/if}
                      </label>

                      {#if (field.type === 'text' || field.type === 'textarea') && (field.rules.min !== undefined || field.rules.max !== undefined)}
                        {@const strLen = String(val ?? '').length}
                        <span class="text-[11px] font-mono {strLen < (field.rules.min ?? 0) ? (strLen > 0 ? 'text-amber-600 font-semibold' : 'text-slate-400') : field.rules.max && strLen > field.rules.max ? 'text-rose-600 font-semibold' : 'text-slate-400'}">
                          {strLen} {field.rules.min !== undefined ? `/ min ${field.rules.min}` : ''} {field.rules.max !== undefined ? `(max ${field.rules.max})` : ''}
                        </span>
                      {/if}
                    </div>

                    <!-- Input par type -->
                    {#if field.type === 'text'}
                      <input
                        id={`input-${field.id}`}
                        type="text"
                        value={val as string ?? ''}
                        oninput={(e) => {
                          appState.updateSelectedRowField(field.key, (e.target as HTMLInputElement).value);
                          markFieldTouched(field.key);
                        }}
                        onblur={() => markFieldTouched(field.key)}
                        placeholder={field.helpText || `Saisissez ${field.label}...`}
                        class="w-full px-3.5 py-2 rounded-xl border text-xs bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition focus:outline-none focus:ring-2 focus:ring-indigo-500
                          {isErrorShown ? 'border-rose-400 focus:ring-rose-400 bg-rose-50/20' : 'border-slate-300 dark:border-slate-700'}"
                      />
                    {:else if field.type === 'textarea'}
                      <textarea
                        id={`input-${field.id}`}
                        value={val as string ?? ''}
                        oninput={(e) => {
                          appState.updateSelectedRowField(field.key, (e.target as HTMLTextAreaElement).value);
                          markFieldTouched(field.key);
                        }}
                        onblur={() => markFieldTouched(field.key)}
                        placeholder={field.helpText || `Saisissez ${field.label}...`}
                        rows="3"
                        class="w-full px-3.5 py-2 rounded-xl border text-xs bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition focus:outline-none focus:ring-2 focus:ring-indigo-500
                          {isErrorShown ? 'border-rose-400 focus:ring-rose-400 bg-rose-50/20' : 'border-slate-300 dark:border-slate-700'}"
                      ></textarea>
                    {:else if field.type === 'boolean'}
                      <div class="flex items-center gap-3 py-1">
                        <button
                          type="button"
                          role="switch"
                          aria-label={field.label}
                          aria-checked={Boolean(val)}
                          onclick={() => {
                            appState.updateSelectedRowField(field.key, !val);
                            markFieldTouched(field.key);
                          }}
                          class="w-11 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer
                            {Boolean(val) ? 'bg-indigo-600 justify-end' : 'bg-slate-300 dark:bg-slate-700 justify-start'}"
                        >
                          <div class="w-4 h-4 rounded-full bg-white shadow-xs"></div>
                        </button>
                        <span class="text-xs font-semibold text-slate-700 dark:text-slate-300">
                          {val ? 'Oui (Actif)' : 'Non (Inactif)'}
                        </span>
                      </div>
                    {:else if field.type === 'number'}
                      <input
                        id={`input-${field.id}`}
                        type="number"
                        value={val !== null && val !== undefined ? String(val) : ''}
                        oninput={(e) => {
                          const v = (e.target as HTMLInputElement).value;
                          appState.updateSelectedRowField(field.key, v === '' ? null : Number(v));
                          markFieldTouched(field.key);
                        }}
                        onblur={() => markFieldTouched(field.key)}
                        placeholder="0"
                        min={field.rules.min}
                        max={field.rules.max}
                        class="w-full px-3.5 py-2 rounded-xl border text-xs font-mono bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition focus:outline-none focus:ring-2 focus:ring-indigo-500
                          {isErrorShown ? 'border-rose-400 focus:ring-rose-400' : 'border-slate-300 dark:border-slate-700'}"
                      />
                    {:else if field.type === 'select'}
                      <select
                        id={`input-${field.id}`}
                        value={val as string ?? ''}
                        onchange={(e) => {
                          appState.updateSelectedRowField(field.key, (e.target as HTMLSelectElement).value);
                          markFieldTouched(field.key);
                        }}
                        class="w-full px-3.5 py-2 rounded-xl border text-xs bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition focus:outline-none focus:ring-2 focus:ring-indigo-500
                          {isErrorShown ? 'border-rose-400 focus:ring-rose-400' : 'border-slate-300 dark:border-slate-700'}"
                      >
                        <option value="">-- Choisir une option --</option>
                        {#each field.options || [] as opt}
                          <option value={opt}>{opt}</option>
                        {/each}
                      </select>
                    {:else if field.type === 'multiselect'}
                      {@const selectedList = (val as string[]) || []}
                      <div class="space-y-1.5">
                        <div class="flex flex-wrap gap-1.5">
                          {#each field.options || [] as opt}
                            {@const isChecked = selectedList.includes(opt)}
                            <button
                              type="button"
                              onclick={() => toggleMultiSelectOption(field.key, opt)}
                              class="px-2.5 py-1 rounded-lg text-xs font-medium transition flex items-center gap-1.5 cursor-pointer
                                {isChecked
                                  ? 'bg-indigo-600 text-white shadow-2xs font-semibold'
                                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'}"
                            >
                              <span>{isChecked ? '✓' : '+'}</span>
                              <span>{opt}</span>
                            </button>
                          {/each}
                        </div>
                        <div class="text-[11px] text-slate-400">
                          {selectedList.length} sélectionné{selectedList.length > 1 ? 's' : ''}
                          {#if field.rules.min || field.rules.max}
                            ({field.rules.min ? `min ${field.rules.min}` : ''}{field.rules.min && field.rules.max ? ', ' : ''}{field.rules.max ? `max ${field.rules.max}` : ''})
                          {/if}
                        </div>
                      </div>
                    {/if}

                    <!-- Erreur inline non agressive -->
                    {#if isErrorShown}
                      <p class="text-xs text-rose-600 dark:text-rose-400 font-medium animate-in fade-in flex items-center gap-1">
                        <span>⚠</span>
                        <span>{fieldError}</span>
                      </p>
                    {/if}

                    <!-- Texte d'aide -->
                    {#if !isErrorShown && field.helpText}
                      <p class="text-[11px] text-slate-400">
                        {field.helpText}
                      </p>
                    {/if}
                  </div>
                {/each}
              </div>
            {/if}

            <!-- 4. Zone Corps éditorial (WYSIWYG) -->
            {#each wysiwygFields as field (field.id)}
              {@const val = appState.selectedRow[field.key]}
              {@const fieldError = rowSummary?.errors[field.key]}
              {@const isErrorShown = shouldShowError(field.key, val, fieldError)}

              <div class="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <div class="flex items-center justify-between text-xs">
                  <label for={`input-${field.id}`} class="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <span>{FIELD_TYPE_METAS[field.type]?.emoji || '✨'}</span>
                    <span>{field.label}</span>
                    {#if field.rules.required}
                      <span class="text-rose-500 font-bold" title="Obligatoire">*</span>
                    {/if}
                  </label>
                  <span class="text-[11px] text-slate-400 font-mono">Format {field.wysiwygFormat || 'html'}</span>
                </div>

                <WysiwygInput
                  value={val as string ?? ''}
                  format={field.wysiwygFormat || 'html'}
                  rules={field.rules}
                  placeholder={field.helpText}
                  onchange={(nextVal) => {
                    appState.updateSelectedRowField(field.key, nextVal);
                    markFieldTouched(field.key);
                  }}
                />

                {#if isErrorShown}
                  <p class="text-xs text-rose-600 dark:text-rose-400 font-medium animate-in fade-in flex items-center gap-1">
                    <span>⚠</span>
                    <span>{fieldError}</span>
                  </p>
                {/if}
              </div>
            {/each}

            <!-- 5. Zone Référencement & Aperçu Google SERP interactif -->
            {#if seoFields.length > 0}
              {@const serpTitle = String(appState.selectedRow[seoTitleField?.key || ''] || getRowPrimaryTitle(appState.selectedRow) || 'Titre de la page')}
              {@const serpDesc = String(appState.selectedRow[seoDescField?.key || ''] || 'Description concise de la page telle qu’elle apparaîtra dans les résultats de recherche Google...')}
              {@const serpSlug = slugField ? String(appState.selectedRow[slugField.key] || 'mon-url') : 'page'}

              <div class="p-5 rounded-2xl bg-gradient-to-br from-slate-50 to-indigo-50/30 dark:from-slate-950 dark:to-indigo-950/20 border border-indigo-100/80 dark:border-indigo-900/40 space-y-4">
                <div class="flex items-center justify-between pb-2 border-b border-indigo-100/60 dark:border-indigo-900/40">
                  <div class="flex items-center gap-2">
                    <span class="w-5 h-5 rounded-md bg-blue-600 text-white flex items-center justify-center font-black text-xs">
                      G
                    </span>
                    <h3 class="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                      Optimisation SEO Google
                    </h3>
                  </div>
                  <span class="text-[11px] text-slate-400">Aperçu SERP en temps réel</span>
                </div>

                <!-- Simulation Google SERP dynamique -->
                <div class="p-3.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 font-sans space-y-1 shadow-2xs">
                  <div class="text-[11px] text-slate-500 dark:text-slate-400 truncate flex items-center gap-1">
                    <span>https://www.monsite.fr</span>
                    <span>&gt;</span>
                    <span class="font-medium text-slate-700 dark:text-slate-300">{serpSlug}</span>
                  </div>
                  <div class="text-base text-blue-700 dark:text-blue-400 font-medium leading-tight truncate">
                    {serpTitle}
                  </div>
                  <div class="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed">
                    {serpDesc}
                  </div>
                </div>

                <!-- Champs SEO avec jauge de longueur Google -->
                <div class="space-y-3.5 pt-1">
                  {#each seoFields as field (field.id)}
                    {@const val = appState.selectedRow[field.key]}
                    {@const fieldError = rowSummary?.errors[field.key]}
                    {@const isErrorShown = shouldShowError(field.key, val, fieldError)}
                    {@const isRequired = field.rules.required}
                    {@const strLen = String(val ?? '').length}

                    <div class="space-y-1.5">
                      <div class="flex items-center justify-between text-xs">
                        <label for={`input-${field.id}`} class="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                          <span>{FIELD_TYPE_METAS[field.type]?.emoji || '🔍'}</span>
                          <span>{field.label}</span>
                          {#if isRequired}
                            <span class="text-rose-500 font-bold" title="Obligatoire">*</span>
                          {/if}
                        </label>

                        {#if field.rules.min !== undefined || field.rules.max !== undefined}
                          <span class="text-[11px] font-mono {strLen === 0 ? 'text-slate-400' : strLen < (field.rules.min ?? 0) ? 'text-amber-600 font-semibold' : field.rules.max && strLen > field.rules.max ? 'text-rose-600 font-semibold' : 'text-emerald-600 font-semibold'}">
                            {strLen} {field.rules.min !== undefined ? `/ min ${field.rules.min}` : ''} {field.rules.max !== undefined ? `(max ${field.rules.max})` : ''}
                          </span>
                        {/if}
                      </div>

                      {#if field.type === 'textarea'}
                        <textarea
                          id={`input-${field.id}`}
                          value={val as string ?? ''}
                          oninput={(e) => {
                            appState.updateSelectedRowField(field.key, (e.target as HTMLTextAreaElement).value);
                            markFieldTouched(field.key);
                          }}
                          onblur={() => markFieldTouched(field.key)}
                          placeholder={field.helpText || `Saisissez ${field.label}...`}
                          rows="2"
                          class="w-full px-3.5 py-2 rounded-xl border text-xs bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 transition focus:outline-none focus:ring-2 focus:ring-indigo-500
                            {isErrorShown ? 'border-rose-400 focus:ring-rose-400 bg-rose-50/20' : 'border-slate-300 dark:border-slate-700'}"
                        ></textarea>
                      {:else}
                        <input
                          id={`input-${field.id}`}
                          type="text"
                          value={val as string ?? ''}
                          oninput={(e) => {
                            appState.updateSelectedRowField(field.key, (e.target as HTMLInputElement).value);
                            markFieldTouched(field.key);
                          }}
                          onblur={() => markFieldTouched(field.key)}
                          placeholder={field.helpText || `Saisissez ${field.label}...`}
                          class="w-full px-3.5 py-2 rounded-xl border text-xs bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 transition focus:outline-none focus:ring-2 focus:ring-indigo-500
                            {isErrorShown ? 'border-rose-400 focus:ring-rose-400 bg-rose-50/20' : 'border-slate-300 dark:border-slate-700'}"
                        />
                      {/if}

                      {#if isErrorShown}
                        <p class="text-xs text-rose-600 dark:text-rose-400 font-medium animate-in fade-in flex items-center gap-1">
                          <span>⚠</span>
                          <span>{fieldError}</span>
                        </p>
                      {/if}
                    </div>
                  {/each}
                </div>
              </div>
            {/if}
          </form>
        </div>
      {:else}
        <div class="p-12 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-3">
          <p class="text-sm text-slate-500">Aucune entrée disponible.</p>
          <button
            type="button"
            onclick={() => appState.addRow()}
            class="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-semibold"
          >
            + Créer une première entrée
          </button>
        </div>
      {/if}
    </div>
  </div>
</div>

<CsvExportModal
  isOpen={isCsvExportOpen}
  onClose={() => (isCsvExportOpen = false)}
/>
