<script lang="ts">
  import { appState } from '../lib/storage.svelte';
  import { parsePleaseFile, exportPleaseFile } from '../lib/codec';
  import ShareModal from './ShareModal.svelte';

  let isShareOpen = $state(false);
  let isTemplateMenuOpen = $state(false);
  let fileInputEl: HTMLInputElement | null = $state(null);
  let menuContainerEl: HTMLDivElement | null = $state(null);

  function handleSwitchTemplate(tplId: string) {
    const found = appState.templatesLibrary.find((t) => t.id === tplId);
    if (found) {
      appState.selectTemplate(found);
    }
    isTemplateMenuOpen = false;
  }

  function handleCreateTemplate() {
    isTemplateMenuOpen = false;
    appState.createNewTemplate();
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
    isTemplateMenuOpen = false;
  }

  function handleExportTemplate() {
    isTemplateMenuOpen = false;
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
      appState.showToast(`Fichier « ${filename} » téléchargé.`, 'success');
    } catch (e: any) {
      appState.showToast(e.message, 'error');
    }
  }

  function handleDeleteCurrentTemplate() {
    isTemplateMenuOpen = false;
    if (appState.templatesLibrary.length <= 1) {
      appState.showToast('Impossible de supprimer le seul gabarit restant.', 'warning');
      return;
    }
    const name = appState.currentTemplate.name;
    if (confirm(`Voulez-vous vraiment supprimer le gabarit « ${name} » et toutes ses données locales ?`)) {
      appState.deleteTemplate(appState.currentTemplate.id);
    }
  }

  function handleDocumentClick(e: MouseEvent) {
    if (menuContainerEl && !menuContainerEl.contains(e.target as Node)) {
      isTemplateMenuOpen = false;
    }
  }
</script>

<svelte:window onclick={handleDocumentClick} />

<header class="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-30 shadow-2xs">
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-3">
    <!-- 1. Logo & Identité -->
    <div class="flex items-center gap-3 shrink-0">
      <div class="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-black shadow-xs text-base">
        ✓
      </div>
      <div class="leading-tight">
        <div class="flex items-center gap-1.5">
          <span class="font-extrabold text-slate-900 dark:text-white tracking-tight text-base">Please Validate</span>
          <span class="px-1.5 py-0.2 rounded text-[10px] font-mono bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 font-bold border border-indigo-200/60 dark:border-indigo-800/60">
            v1.0
          </span>
        </div>
      </div>
    </div>

    <!-- 2. Centre : Sélecteur de gabarit unifié (Bouton contextuel avec menu déroulant) -->
    <div class="relative flex-1 max-w-md mx-2" bind:this={menuContainerEl}>
      <button
        type="button"
        onclick={() => (isTemplateMenuOpen = !isTemplateMenuOpen)}
        aria-expanded={isTemplateMenuOpen}
        aria-haspopup="menu"
        title="Changer de gabarit ou gérer le gabarit actif"
        class="w-full flex items-center justify-between gap-2 px-3.5 py-2 bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-100 transition shadow-2xs"
      >
        <div class="flex items-center gap-2 truncate">
          <span class="text-slate-400 font-normal hidden sm:inline">Gabarit :</span>
          <span class="truncate font-bold text-slate-900 dark:text-white">{appState.currentTemplate.name}</span>
          <span class="px-1.5 py-0.2 rounded-md bg-slate-200/80 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-[10px] font-medium shrink-0">
            {appState.currentTemplate.fields.length} champs
          </span>
        </div>
        <svg class="w-4 h-4 text-slate-400 shrink-0 transition-transform {isTemplateMenuOpen ? 'rotate-180' : ''}" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {#if isTemplateMenuOpen}
        <div
          class="absolute left-0 right-0 mt-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl py-2 text-xs text-slate-700 dark:text-slate-200 z-50 animate-in fade-in zoom-in-95 max-h-[420px] overflow-y-auto"
          role="menu"
        >
          <!-- Liste des gabarits enregistrés -->
          <div class="px-3.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Mes Gabarits ({appState.templatesLibrary.length})
          </div>

          <div class="py-1 space-y-0.5">
            {#each appState.templatesLibrary as tpl}
              {@const isActive = tpl.id === appState.currentTemplate.id}
              <button
                type="button"
                role="menuitem"
                onclick={() => handleSwitchTemplate(tpl.id)}
                class="w-full text-left px-3.5 py-2 flex items-center justify-between gap-2 transition
                  {isActive
                    ? 'bg-indigo-50/80 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 font-bold'
                    : 'hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'}"
              >
                <div class="flex items-center gap-2 truncate">
                  {#if isActive}
                    <span class="text-indigo-600 dark:text-indigo-400 font-black">✓</span>
                  {:else}
                    <span class="w-3"></span>
                  {/if}
                  <span class="truncate">{tpl.name}</span>
                </div>
                <span class="text-[10px] text-slate-400 shrink-0">{tpl.fields.length} champs</span>
              </button>
            {/each}
          </div>

          <!-- Actions du gabarit -->
          <div class="my-1.5 border-t border-slate-100 dark:border-slate-800"></div>
          <div class="px-3.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Actions
          </div>

          <button
            type="button"
            role="menuitem"
            onclick={handleCreateTemplate}
            class="w-full text-left px-3.5 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2.5 transition text-indigo-600 dark:text-indigo-400 font-semibold"
          >
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
            </svg>
            <span>Nouveau gabarit vierge</span>
          </button>

          <button
            type="button"
            role="menuitem"
            onclick={handleExportTemplate}
            class="w-full text-left px-3.5 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2.5 transition"
          >
            <svg class="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            <span>Exporter ce gabarit (.please)</span>
          </button>

          <button
            type="button"
            role="menuitem"
            onclick={() => fileInputEl?.click()}
            class="w-full text-left px-3.5 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2.5 transition"
          >
            <svg class="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            <span>Importer un gabarit (.please)</span>
          </button>

          {#if appState.templatesLibrary.length > 1}
            <div class="my-1 border-t border-slate-100 dark:border-slate-800"></div>
            <button
              type="button"
              role="menuitem"
              onclick={handleDeleteCurrentTemplate}
              class="w-full text-left px-3.5 py-2 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 flex items-center gap-2.5 transition"
            >
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              <span>Supprimer ce gabarit</span>
            </button>
          {/if}
        </div>
      {/if}
    </div>

    <input
      bind:this={fileInputEl}
      type="file"
      accept=".please,.json"
      onchange={handleFileImport}
      class="hidden"
    />

    <!-- 3. Droite : Partager + Sélecteur de Mode -->
    <div class="flex items-center gap-2 shrink-0">
      <!-- Bouton Partager -->
      <button
        type="button"
        onclick={() => (isShareOpen = true)}
        title="Partager le lien autonome de ce gabarit"
        class="h-9 px-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-800/80 text-xs font-semibold flex items-center gap-1.5 transition"
      >
        <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
        </svg>
        <span class="hidden sm:inline">Partager</span>
      </button>

      <!-- Toggle Mode Saisie / Gabarit -->
      <nav class="flex items-center gap-0.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl" aria-label="Modes de l'application">
        <button
          type="button"
          onclick={() => (appState.viewMode = 'filler')}
          class="px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition
            {appState.viewMode === 'filler'
              ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}"
        >
          <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
          </svg>
          <span>Saisie</span>
          <span class="px-1.5 py-0.2 rounded-full text-[10px] {appState.validation.allValid ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-bold' : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 font-bold'}">
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
          <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          <span>Structure</span>
          <span class="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium">
            {appState.currentTemplate.fields.length}
          </span>
        </button>
      </nav>
    </div>
  </div>
</header>

<ShareModal isOpen={isShareOpen} onClose={() => (isShareOpen = false)} />
