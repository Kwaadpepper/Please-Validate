<script lang="ts">
  import { appState } from '../lib/storage.svelte';
  import { parsePleaseFile, exportPleaseFile } from '../lib/codec';
  import ShareModal from './ShareModal.svelte';

  let isShareOpen = $state(false);
  let fileInputEl: HTMLInputElement | null = $state(null);

  function handleTemplateSelect(e: Event) {
    const target = e.target as HTMLSelectElement;
    const selectedId = target.value;
    const found = appState.templatesLibrary.find((t) => t.id === selectedId);
    if (found) {
      appState.selectTemplate(found);
    }
  }

  function handleFileImport(e: Event) {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const content = reader.result as string;
        const importedTpl = parsePleaseFile(content);
        appState.selectTemplate(importedTpl);
        appState.showToast(`Gabarit « ${importedTpl.name} » importé avec succès !`, 'success');
      } catch (err: any) {
        appState.showToast(`Erreur d'import du gabarit : ${err.message}`, 'error');
      }
    };
    reader.readAsText(file);
    input.value = '';
  }

  function handleExportTemplate() {
    try {
      const { filename, content } = exportPleaseFile(appState.currentTemplate);
      const blob = new Blob([content], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      appState.showToast(`Fichier « ${filename} » exporté.`, 'success');
    } catch (e: any) {
      appState.showToast(e.message, 'error');
    }
  }

  function handleDeleteCurrentTemplate() {
    if (appState.templatesLibrary.length <= 1) {
      appState.showToast('Impossible de supprimer l’unique gabarit de la liste.', 'warning');
      return;
    }
    const name = appState.currentTemplate.name;
    if (confirm(`Voulez-vous vraiment supprimer le gabarit « ${name} » et toutes ses données locales ?`)) {
      appState.deleteTemplate(appState.currentTemplate.id);
    }
  }
</script>

<header class="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-30 shadow-xs">
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 min-h-16 py-2 flex flex-wrap items-center justify-between gap-3">
    <!-- Logo & Titre -->
    <div class="flex items-center gap-3 shrink-0">
      <div class="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 text-white flex items-center justify-center font-black shadow-md shadow-indigo-500/20 text-lg">
        ✓
      </div>
      <div>
        <div class="flex items-center gap-2">
          <span class="font-extrabold text-slate-900 dark:text-white tracking-tight text-base sm:text-lg">Please Validate</span>
          <span class="px-1.5 py-0.5 rounded text-[10px] font-mono bg-indigo-50 text-indigo-700 dark:bg-indigo-950/80 dark:text-indigo-300 font-semibold border border-indigo-200/50 dark:border-indigo-800/50">
            v1.0
          </span>
        </div>
        <p class="text-[11px] text-slate-500 hidden sm:block">Validation CMS & export CSV blindé</p>
      </div>
    </div>

    <!-- Sélecteur de gabarit large & Actions gabarit -->
    <div class="flex items-center gap-2 flex-1 max-w-2xl justify-center">
      <div class="relative flex-1 min-w-[220px] sm:min-w-[320px] md:min-w-[380px]">
        <select
          id="template-library-select"
          aria-label="Sélectionner un gabarit dans la bibliothèque"
          value={appState.currentTemplate.id}
          onchange={handleTemplateSelect}
          class="w-full appearance-none bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg pl-3 pr-8 py-1.5 text-xs font-semibold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
          title="Sélectionner un gabarit"
        >
          {#each appState.templatesLibrary as tpl}
            <option value={tpl.id}>
              {tpl.name} ({tpl.fields.length} champs)
            </option>
          {/each}
        </select>
        <div class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-500">
          <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      <!-- Supprimer le gabarit de la liste (localStorage) -->
      <button
        type="button"
        disabled={appState.templatesLibrary.length <= 1}
        onclick={handleDeleteCurrentTemplate}
        title={appState.templatesLibrary.length <= 1 ? "Impossible de supprimer l'unique gabarit restant" : `Supprimer le gabarit « ${appState.currentTemplate.name} » de la mémoire`}
        class="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 disabled:opacity-20 transition"
        aria-label="Supprimer ce gabarit de la liste"
      >
        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      </button>

      <!-- Nouveau gabarit -->
      <button
        type="button"
        onclick={() => appState.createNewTemplate()}
        title="Créer un nouveau gabarit vierge"
        class="p-1.5 sm:px-2.5 sm:py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1 transition"
      >
        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
        </svg>
        <span class="hidden sm:inline">Nouveau</span>
      </button>

      <!-- Importer .please -->
      <button
        type="button"
        onclick={() => fileInputEl?.click()}
        title="Importer un fichier gabarit .please"
        class="p-1.5 sm:px-2.5 sm:py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1 transition"
      >
        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
        </svg>
        <span class="hidden md:inline">Importer .please</span>
      </button>
      <input
        bind:this={fileInputEl}
        type="file"
        accept=".please,.json"
        onchange={handleFileImport}
        class="hidden"
      />

      <!-- Exporter .please -->
      <button
        type="button"
        onclick={handleExportTemplate}
        title="Télécharger ce gabarit sous forme de fichier portable .please"
        class="p-1.5 sm:px-2.5 sm:py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1 transition"
      >
        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
        <span class="hidden md:inline">Exporter .please</span>
      </button>

      <!-- Partager -->
      <button
        type="button"
        onclick={() => (isShareOpen = true)}
        title="Partager le lien du gabarit"
        class="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm transition"
      >
        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
        </svg>
        <span>Partager</span>
      </button>
    </div>

    <!-- Onglets de navigation -->
    <nav class="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl shrink-0" aria-label="Modes">
      <button
        type="button"
        onclick={() => (appState.viewMode = 'filler')}
        class="px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition
          {appState.viewMode === 'filler'
            ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}"
      >
        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
        </svg>
        <span>Saisie</span>
        <span class="px-1.5 py-0.2 rounded-full text-[10px] {appState.validation.allValid ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'}">
          {appState.validation.totalValid}/{appState.rows.length}
        </span>
      </button>

      <button
        type="button"
        onclick={() => (appState.viewMode = 'builder')}
        class="px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition
          {appState.viewMode === 'builder'
            ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}"
      >
        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
        <span>Gabarit</span>
        <span class="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
          {appState.currentTemplate.fields.length}
        </span>
      </button>
    </nav>
  </div>
</header>

<ShareModal isOpen={isShareOpen} onClose={() => (isShareOpen = false)} />
