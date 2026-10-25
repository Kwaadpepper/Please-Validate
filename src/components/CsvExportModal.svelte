<script lang="ts">
  import { appState } from '../lib/storage.svelte';
  import { serializeToCsv } from '../lib/csv';
  import { slugify } from '../lib/slug';

  interface Props {
    isOpen: boolean;
    onClose: () => void;
  }

  let { isOpen, onClose }: Props = $props();

  let delimiter = $state<',' | ';'>(';'); // Point-virgule par défaut pour Excel français
  let withBom = $state(true);

  let invalidSummaries = $derived(
    appState.validation.summaries.filter((s) => !s.isValid)
  );

  function handleDownload() {
    try {
      const csvContent = serializeToCsv(appState.currentTemplate, appState.rows, {
        delimiter,
        withBom
      });

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const baseName = slugify(appState.currentTemplate.name) || 'donnees';
      a.href = url;
      a.download = `${baseName}-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      appState.showToast(`CSV exporté avec succès (${appState.rows.length} lignes).`, 'success');
      onClose();
    } catch (e: any) {
      appState.showToast(`Erreur d'export : ${e.message}`, 'error');
    }
  }
</script>

{#if isOpen}
  <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
    <div
      class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-2xl w-full p-6 text-slate-800 dark:text-slate-100 space-y-5 max-h-[90vh] flex flex-col"
      role="dialog"
      aria-modal="true"
      aria-labelledby="csv-export-title"
    >
      <div class="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 shrink-0">
        <div class="flex items-center gap-2">
          <div class="p-2 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 rounded-lg">
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h2 id="csv-export-title" class="text-lg font-bold">Exporter vers CSV (RFC 4180)</h2>
        </div>
        <button
          type="button"
          onclick={onClose}
          class="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg cursor-pointer focus-visible:ring-2 focus-visible:ring-emerald-500"
          aria-label="Fermer"
        >
          <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div class="space-y-4 text-sm overflow-y-auto pr-1">
        <!-- État de validation -->
        {#if invalidSummaries.length > 0}
          <div class="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 space-y-2">
            <div class="flex items-center gap-2 font-semibold">
              <svg class="w-5 h-5 text-amber-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span>{invalidSummaries.length} ligne{invalidSummaries.length > 1 ? 's' : ''} sur {appState.rows.length} comporte{invalidSummaries.length > 1 ? 'nt' : ''} des erreurs</span>
            </div>
            <p class="text-xs text-amber-800/90 dark:text-amber-300/90">
              L’export reste possible afin de sauvegarder votre travail en cours, mais certaines données ne respectent pas encore les contraintes du CMS.
            </p>
            <div class="mt-2 max-h-36 overflow-y-auto bg-white/70 dark:bg-slate-900/60 rounded-lg p-2.5 text-xs space-y-1.5 border border-amber-200/60 dark:border-amber-900/60">
              {#each invalidSummaries as item}
                <div class="flex items-start gap-2">
                  <span class="font-bold text-amber-700 dark:text-amber-400 shrink-0">Ligne #{item.rowIndex} :</span>
                  <span class="text-slate-700 dark:text-slate-300">
                    {Object.values(item.errors).join(' • ')}
                  </span>
                </div>
              {/each}
            </div>
          </div>
        {:else}
          <div class="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 flex items-center gap-2.5 text-xs">
            <svg class="w-5 h-5 text-emerald-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span class="font-medium">Toutes les {appState.rows.length} lignes sont 100% valides et conformes au gabarit.</span>
          </div>
        {/if}

        <!-- Options CSV -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
          <div>
            <label for="delimiter-select" class="block font-medium text-xs text-slate-700 dark:text-slate-300 mb-1.5">
              Séparateur de colonnes
            </label>
            <select
              id="delimiter-select"
              bind:value={delimiter}
              class="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
            >
              <option value=";">Point-virgule (;) — Recommandé Excel France</option>
              <option value=",">Virgule (,) — Standard international</option>
            </select>
          </div>

          <div>
            <span class="block font-medium text-xs text-slate-700 dark:text-slate-300 mb-1.5">
              Encodage & Compatibilité
            </span>
            <label class="flex items-center gap-2 cursor-pointer mt-2 text-xs text-slate-600 dark:text-slate-400">
              <input
                type="checkbox"
                bind:checked={withBom}
                class="rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
              />
              <span>Ajouter le BOM UTF-8 (anti-accents corrompus dans Excel)</span>
            </label>
          </div>
        </div>
      </div>

      <div class="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3 shrink-0">
        <button
          type="button"
          onclick={onClose}
          class="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-semibold transition cursor-pointer focus-visible:ring-2 focus-visible:ring-emerald-500"
        >
          Annuler
        </button>
        <button
          type="button"
          onclick={handleDownload}
          class="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-2 shadow-sm transition cursor-pointer focus-visible:ring-2 focus-visible:ring-emerald-500"
        >
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Télécharger le fichier CSV
        </button>
      </div>
    </div>
  </div>
{/if}
