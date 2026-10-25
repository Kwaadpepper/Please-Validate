<script lang="ts">
  import { appState } from '../lib/storage.svelte';
  import WysiwygInput from './WysiwygInput.svelte';
  import CsvExportModal from './CsvExportModal.svelte';
  import type { FieldDefinition, RowData } from '../lib/types';
  import { extractRawText } from '../lib/validator';

  let isCsvExportOpen = $state(false);
  let csvFileInputEl: HTMLInputElement | null = $state(null);

  // Détection des champs SEO pour l'aperçu Google SERP
  let seoTitleField = $derived(
    appState.currentTemplate.fields.find(
      (f) => f.key === 'seo_title' || f.key.toLowerCase().includes('seo_tit') || f.label.toLowerCase().includes('seo')
    )
  );

  let seoDescField = $derived(
    appState.currentTemplate.fields.find(
      (f) => f.key === 'seo_description' || f.key.toLowerCase().includes('seo_desc') || f.label.toLowerCase().includes('meta desc')
    )
  );

  let slugField = $derived(
    appState.currentTemplate.fields.find((f) => f.type === 'slug')
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
  }
</script>

<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
  <!-- Barre d'action supérieure & Statistiques -->
  <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <!-- Indicateur d'état global -->
      <div class="flex items-center gap-3">
        {#if appState.validation.allValid}
          <div class="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <div class="flex items-center gap-2">
              <h1 class="text-base font-extrabold text-slate-900 dark:text-white">
                Toutes les entrées sont valides ({appState.validation.totalValid}/{appState.rows.length})
              </h1>
              <span class="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                Prêt pour export
              </span>
            </div>
            <p class="text-xs text-slate-500">
              Toutes les contraintes du gabarit « {appState.currentTemplate.name} » sont respectées.
            </p>
          </div>
        {:else}
          <div class="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950/80 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
            <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div>
            <div class="flex items-center gap-2">
              <h1 class="text-base font-extrabold text-slate-900 dark:text-white">
                {appState.validation.totalInvalid} entrée{appState.validation.totalInvalid > 1 ? 's' : ''} à corriger sur {appState.rows.length}
              </h1>
              <span class="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                Validation en cours
              </span>
            </div>
            <p class="text-xs text-slate-500">
              Remplissez les champs obligatoires ou ajustez les longueurs signalées ci-dessous.
            </p>
          </div>
        {/if}
      </div>

      <!-- Boutons d'action -->
      <div class="flex items-center gap-2 flex-wrap">
        <button
          type="button"
          onclick={() => appState.addRow()}
          class="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm transition"
        >
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
          <span>Ajouter une ligne</span>
        </button>

        <!-- Import CSV -->
        <button
          type="button"
          onclick={() => csvFileInputEl?.click()}
          title="Importer un fichier CSV existant"
          class="px-3.5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition"
        >
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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

        <!-- Export CSV -->
        <button
          type="button"
          onclick={() => (isCsvExportOpen = true)}
          title="Exporter toutes les données au format CSV blindé"
          class="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm transition"
        >
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          <span>Exporter CSV</span>
        </button>

        <button
          type="button"
          onclick={handleConfirmClear}
          title="Vider les lignes saisies"
          class="p-2 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          aria-label="Vider les données"
        >
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>
    </div>

    <!-- Filtres d'état et Recherche -->
    <div class="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
      <div class="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl">
        <button
          type="button"
          onclick={() => (appState.filterStatus = 'all')}
          class="px-3 py-1 rounded-lg font-medium transition
            {appState.filterStatus === 'all'
              ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs font-bold'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'}"
        >
          Toutes ({appState.rows.length})
        </button>
        <button
          type="button"
          onclick={() => (appState.filterStatus = 'invalid')}
          class="px-3 py-1 rounded-lg font-medium transition flex items-center gap-1
            {appState.filterStatus === 'invalid'
              ? 'bg-white dark:bg-slate-900 text-amber-600 dark:text-amber-400 shadow-2xs font-bold'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'}"
        >
          <span>En erreur</span>
          <span class="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
            {appState.validation.totalInvalid}
          </span>
        </button>
        <button
          type="button"
          onclick={() => (appState.filterStatus = 'valid')}
          class="px-3 py-1 rounded-lg font-medium transition flex items-center gap-1
            {appState.filterStatus === 'valid'
              ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-2xs font-bold'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'}"
        >
          <span>Valides</span>
          <span class="px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
            {appState.validation.totalValid}
          </span>
        </button>
      </div>

      <!-- Champ de recherche -->
      <div class="relative max-w-xs w-full">
        <input
          type="text"
          bind:value={appState.searchTerm}
          placeholder="Rechercher dans les données..."
          class="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
        <svg class="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </div>
    </div>
  </div>

  <!-- Layout Principal Split View (Liste à gauche, Édition à droite) -->
  <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
    <!-- Colonne Gauche : Liste des entrées (4 cols) -->
    <div class="lg:col-span-4 space-y-2">
      <div class="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-500 px-1">
        <span>Entrées ({appState.filteredRows.length})</span>
        <button
          type="button"
          onclick={() => appState.addRow()}
          class="text-indigo-600 dark:text-indigo-400 hover:underline font-semibold"
        >
          + Ajouter
        </button>
      </div>

      <div class="space-y-2 max-h-[calc(100vh-220px)] overflow-y-auto pr-1">
        {#if appState.filteredRows.length === 0}
          <div class="p-6 text-center bg-white dark:bg-slate-900 border border-dashed border-slate-300 dark:border-slate-800 rounded-2xl text-xs text-slate-500 space-y-2">
            <p>Aucune entrée ne correspond aux filtres.</p>
            <button
              type="button"
              onclick={() => {
                appState.filterStatus = 'all';
                appState.searchTerm = '';
              }}
              class="text-indigo-600 underline font-medium"
            >
              Réinitialiser les filtres
            </button>
          </div>
        {/if}

        {#each appState.filteredRows as row, idx (row._id)}
          {@const summary = appState.validation.summaries.find((s) => s.rowId === row._id)}
          {@const isSelected = appState.selectedRowId === row._id}
          {@const errorCount = summary ? Object.keys(summary.errors).length : 0}

          <div
            role="button"
            tabindex="0"
            onclick={() => (appState.selectedRowId = row._id)}
            onkeydown={(e) => e.key === 'Enter' && (appState.selectedRowId = row._id)}
            class="group p-3.5 rounded-2xl border text-left transition relative cursor-pointer
              {isSelected
                ? 'bg-indigo-50/70 dark:bg-indigo-950/40 border-indigo-500 dark:border-indigo-500 ring-2 ring-indigo-500/20 shadow-xs'
                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'}"
          >
            <div class="flex items-start justify-between gap-2">
              <div class="flex items-center gap-2">
                <span class="text-xs font-mono font-bold text-slate-400">
                  #{appState.rows.indexOf(row) + 1}
                </span>
                <h3 class="text-xs font-bold text-slate-900 dark:text-slate-100 line-clamp-1">
                  {getRowPrimaryTitle(row)}
                </h3>
              </div>

              <!-- Badge statut -->
              {#if summary?.isValid}
                <span class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 shrink-0">
                  ✓ Valide
                </span>
              {:else}
                <span class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 shrink-0">
                  {errorCount} erreur{errorCount > 1 ? 's' : ''}
                </span>
              {/if}
            </div>

            <!-- Sous-titre ou slug -->
            {#if getRowSubtitle(row)}
              <p class="text-[11px] font-mono text-slate-500 dark:text-slate-400 mt-1 truncate">
                {getRowSubtitle(row)}
              </p>
            {/if}

            <!-- Boutons actions rapides en survol -->
            <div class="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-end gap-1 opacity-80 group-hover:opacity-100 transition">
              <button
                type="button"
                onclick={(e) => {
                  e.stopPropagation();
                  appState.duplicateRow(row._id);
                }}
                title="Dupliquer cette ligne"
                class="p-1 text-slate-400 hover:text-indigo-600 rounded"
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
                title="Supprimer cette ligne"
                class="p-1 text-slate-400 hover:text-rose-600 rounded"
              >
                <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          </div>
        {/each}
      </div>
    </div>

    <!-- Colonne Droite : Formulaire d'édition de la ligne sélectionnée (8 cols) -->
    <div class="lg:col-span-8 space-y-6">
      {#if appState.selectedRow}
        {@const selectedIdx = appState.rows.indexOf(appState.selectedRow) + 1}
        {@const rowSummary = appState.selectedRowSummary}

        <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-6">
          <!-- En-tête formulaire -->
          <div class="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
            <div class="flex items-center gap-3">
              <span class="px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400 font-mono text-xs font-bold">
                Ligne #{selectedIdx}
              </span>
              <div>
                <h2 class="text-base font-bold text-slate-900 dark:text-white">
                  {getRowPrimaryTitle(appState.selectedRow)}
                </h2>
                <p class="text-[11px] text-slate-500">
                  Modifiez les données ci-dessous. La validation est recalculée instantanément.
                </p>
              </div>
            </div>

            <div class="flex items-center gap-1.5">
              <button
                type="button"
                onclick={() => appState.duplicateRow(appState.selectedRow!._id)}
                class="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 font-medium flex items-center gap-1 transition"
              >
                <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                <span>Dupliquer</span>
              </button>
              <button
                type="button"
                onclick={() => appState.deleteRow(appState.selectedRow!._id)}
                class="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 font-medium flex items-center gap-1 transition"
              >
                <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                <span>Supprimer</span>
              </button>
            </div>
          </div>

          <!-- Aperçu Google SERP interactif (si champs SEO détectés) -->
          {#if seoTitleField || seoDescField}
            {@const serpTitle = String(appState.selectedRow[seoTitleField?.key || ''] || getRowPrimaryTitle(appState.selectedRow) || 'Titre de la page')}
            {@const serpDesc = String(appState.selectedRow[seoDescField?.key || ''] || 'Description de la page telle qu’elle apparaîtra dans les résultats de recherche Google...')}
            {@const serpSlug = slugField ? String(appState.selectedRow[slugField.key] || 'mon-url') : 'page'}

            <div class="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 space-y-2">
              <div class="flex items-center justify-between">
                <span class="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <span class="text-blue-500 font-extrabold">G</span>
                  <span>Aperçu du snippet Google SERP</span>
                </span>
                <span class="text-[10px] text-slate-400">Simulation temps réel</span>
              </div>

              <!-- Bloc Google snippet -->
              <div class="p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 font-sans space-y-1">
                <div class="text-[11px] text-slate-600 dark:text-slate-400 truncate flex items-center gap-1">
                  <span class="text-slate-400">https://www.monsite.fr</span>
                  <span class="text-slate-400">&gt;</span>
                  <span class="font-medium text-slate-700 dark:text-slate-300">{serpSlug}</span>
                </div>
                <div class="text-base text-blue-700 dark:text-blue-400 hover:underline font-medium cursor-pointer leading-tight truncate">
                  {serpTitle}
                </div>
                <div class="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed">
                  {serpDesc}
                </div>
              </div>
            </div>
          {/if}

          <!-- Formulaire des champs -->
          <form class="space-y-5" onsubmit={(e) => e.preventDefault()}>
            {#each appState.currentTemplate.fields as field (field.id)}
              {@const val = appState.selectedRow[field.key]}
              {@const fieldError = rowSummary?.errors[field.key]}
              {@const isRequired = field.rules.required}
              {@const isNullable = field.rules.nullable}

              <div class="space-y-1.5">
                <!-- Libellé du champ et métas -->
                <div class="flex items-center justify-between text-xs">
                  <label for={`input-${field.id}`} class="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                    <span>{field.label}</span>
                    {#if isRequired}
                      <span class="text-rose-500 font-bold" title="Obligatoire">*</span>
                    {:else if isNullable}
                      <span class="text-slate-400 font-normal text-[11px]">(optionnel)</span>
                    {/if}
                  </label>

                  <!-- Compteur pour text / textarea si min/max défini -->
                  {#if (field.type === 'text' || field.type === 'textarea') && (field.rules.min !== undefined || field.rules.max !== undefined)}
                    {@const strLen = String(val ?? '').length}
                    <span class="text-[11px] font-mono {strLen < (field.rules.min ?? 0) ? 'text-amber-600 font-semibold' : field.rules.max && strLen > field.rules.max ? 'text-rose-600 font-semibold' : 'text-slate-400'}">
                      {strLen} {field.rules.min !== undefined ? `/ min ${field.rules.min}` : ''} {field.rules.max !== undefined ? `(max ${field.rules.max})` : ''}
                    </span>
                  {/if}
                </div>

                <!-- Input selon type -->
                {#if field.type === 'text'}
                  <input
                    id={`input-${field.id}`}
                    type="text"
                    value={val as string ?? ''}
                    oninput={(e) => appState.updateSelectedRowField(field.key, (e.target as HTMLInputElement).value)}
                    placeholder={field.helpText || `Saisissez ${field.label}...`}
                    class="w-full px-3.5 py-2.5 rounded-xl border text-sm bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition focus:outline-none focus:ring-2 focus:ring-indigo-500
                      {fieldError ? 'border-rose-400 focus:ring-rose-400 bg-rose-50/20' : 'border-slate-300 dark:border-slate-700'}"
                  />
                {:else if field.type === 'textarea'}
                  <textarea
                    id={`input-${field.id}`}
                    value={val as string ?? ''}
                    oninput={(e) => appState.updateSelectedRowField(field.key, (e.target as HTMLTextAreaElement).value)}
                    placeholder={field.helpText || `Saisissez ${field.label}...`}
                    rows="3"
                    class="w-full px-3.5 py-2.5 rounded-xl border text-sm bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition focus:outline-none focus:ring-2 focus:ring-indigo-500
                      {fieldError ? 'border-rose-400 focus:ring-rose-400 bg-rose-50/20' : 'border-slate-300 dark:border-slate-700'}"
                  ></textarea>
                {:else if field.type === 'slug'}
                  <div class="relative">
                    <input
                      id={`input-${field.id}`}
                      type="text"
                      readonly
                      value={val as string ?? ''}
                      class="w-full pl-9 pr-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800/60 font-mono text-xs text-slate-700 dark:text-slate-300 select-all cursor-not-allowed"
                    />
                    <svg class="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <p class="text-[11px] text-slate-400">
                    Généré automatiquement depuis le champ {field.sourceFieldKey ? `« ${field.sourceFieldKey} »` : 'source'}.
                  </p>
                {:else if field.type === 'wysiwyg'}
                  <WysiwygInput
                    value={val as string ?? ''}
                    format={field.wysiwygFormat || 'html'}
                    rules={field.rules}
                    placeholder={field.helpText}
                    onchange={(nextVal) => appState.updateSelectedRowField(field.key, nextVal)}
                  />
                {:else if field.type === 'boolean'}
                  <div class="flex items-center gap-3 py-1">
                    <button
                      type="button"
                      role="switch"
                      aria-label={field.label}
                      aria-checked={Boolean(val)}
                      onclick={() => appState.updateSelectedRowField(field.key, !val)}
                      class="w-11 h-6 flex items-center rounded-full p-1 transition-colors
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
                    }}
                    placeholder="0"
                    min={field.rules.min}
                    max={field.rules.max}
                    class="w-full sm:w-48 px-3.5 py-2 rounded-xl border text-sm font-mono bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition focus:outline-none focus:ring-2 focus:ring-indigo-500
                      {fieldError ? 'border-rose-400 focus:ring-rose-400' : 'border-slate-300 dark:border-slate-700'}"
                  />
                {:else if field.type === 'select'}
                  <select
                    id={`input-${field.id}`}
                    value={val as string ?? ''}
                    onchange={(e) => appState.updateSelectedRowField(field.key, (e.target as HTMLSelectElement).value)}
                    class="w-full px-3.5 py-2.5 rounded-xl border text-sm bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition focus:outline-none focus:ring-2 focus:ring-indigo-500
                      {fieldError ? 'border-rose-400 focus:ring-rose-400' : 'border-slate-300 dark:border-slate-700'}"
                  >
                    <option value="">-- Choisir une option --</option>
                    {#each field.options || [] as opt}
                      <option value={opt}>{opt}</option>
                    {/each}
                  </select>
                {:else if field.type === 'multiselect'}
                  {@const selectedList = (val as string[]) || []}
                  <div class="space-y-2">
                    <div class="flex flex-wrap gap-1.5">
                      {#each field.options || [] as opt}
                        {@const isChecked = selectedList.includes(opt)}
                        <button
                          type="button"
                          onclick={() => toggleMultiSelectOption(field.key, opt)}
                          class="px-3 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-1.5
                            {isChecked
                              ? 'bg-indigo-600 text-white shadow-2xs font-bold'
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

                <!-- Message d'erreur inline -->
                {#if fieldError}
                  <div class="flex items-center gap-1.5 text-xs text-rose-600 dark:text-rose-400 font-medium animate-in fade-in">
                    <svg class="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>{fieldError}</span>
                  </div>
                {/if}

                <!-- Texte d'aide si pas d'erreur -->
                {#if !fieldError && field.helpText && field.type !== 'slug'}
                  <p class="text-[11px] text-slate-400">
                    {field.helpText}
                  </p>
                {/if}
              </div>
            {/each}
          </form>
        </div>
      {:else}
        <div class="p-12 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-3">
          <p class="text-sm text-slate-500">Aucune entrée sélectionnée.</p>
          <button
            type="button"
            onclick={() => appState.addRow()}
            class="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-semibold"
          >
            + Ajouter une première entrée
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
