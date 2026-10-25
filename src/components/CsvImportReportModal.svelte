<script lang="ts">
  import { appState } from '../lib/storage.svelte';

  interface Props {
    isOpen: boolean;
    onClose: () => void;
  }

  let { isOpen, onClose }: Props = $props();

  let report = $derived(appState.lastImportReport);

  function handleFilterErrors() {
    appState.filterStatus = 'invalid';
    onClose();
  }

  function handleViewAll() {
    appState.filterStatus = 'all';
    onClose();
  }
</script>

{#if isOpen && report}
  <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
    <div
      class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-2xl w-full p-6 text-slate-800 dark:text-slate-100 space-y-5 max-h-[90vh] flex flex-col"
      role="dialog"
      aria-modal="true"
      aria-labelledby="csv-import-report-title"
    >
      <!-- En-tête -->
      <div class="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 shrink-0">
        <div class="flex items-center gap-2">
          <div class="p-2 {report.warnings.length > 0 ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400' : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400'} rounded-lg">
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div>
            <h2 id="csv-import-report-title" class="text-lg font-bold">Rapport d’importation CSV</h2>
            <p class="text-xs text-slate-500">Synthèse des données lues et des avertissements</p>
          </div>
        </div>
        <button
          type="button"
          onclick={onClose}
          class="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg"
          aria-label="Fermer le rapport"
        >
          <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <!-- Contenu déroulant -->
      <div class="space-y-4 text-sm overflow-y-auto pr-1">
        <!-- Chiffres clés -->
        <div class="grid grid-cols-3 gap-3">
          <div class="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 text-center">
            <span class="text-xs text-slate-500 block">Lignes importées</span>
            <span class="text-xl font-extrabold text-slate-900 dark:text-white font-mono">{report.rowsCount}</span>
          </div>

          <div class="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-center">
            <span class="text-xs text-emerald-700 dark:text-emerald-400 block">Lignes valides</span>
            <span class="text-xl font-extrabold text-emerald-600 dark:text-emerald-400 font-mono">{report.totalValid}</span>
          </div>

          <div class="p-3 rounded-xl {report.totalInvalid > 0 ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800' : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800'} border text-center">
            <span class="text-xs {report.totalInvalid > 0 ? 'text-amber-700 dark:text-amber-400' : 'text-slate-500'} block">À corriger</span>
            <span class="text-xl font-extrabold {report.totalInvalid > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400'} font-mono">{report.totalInvalid}</span>
          </div>
        </div>

        <!-- Avertissements détaillés -->
        {#if report.warnings.length > 0}
          <div class="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 space-y-2">
            <div class="flex items-center gap-2 font-bold text-xs uppercase tracking-wider text-amber-800 dark:text-amber-300">
              <svg class="w-4 h-4 text-amber-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span>{report.warnings.length} Avertissement{report.warnings.length > 1 ? 's' : ''} détecté{report.warnings.length > 1 ? 's' : ''} lors de l'import :</span>
            </div>
            <ul class="list-disc list-inside text-xs space-y-1 text-amber-950 dark:text-amber-100 pl-1">
              {#each report.warnings as w}
                <li>{w}</li>
              {/each}
            </ul>
          </div>
        {/if}

        <!-- Colonnes rapprochées -->
        <div class="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 text-xs space-y-1.5">
          <span class="font-medium text-slate-700 dark:text-slate-300 block">
            Colonnes du CSV reconnues ({report.matchedHeaders.length}) :
          </span>
          <div class="flex flex-wrap gap-1.5 pt-1">
            {#each report.matchedHeaders as col}
              <span class="px-2 py-0.5 rounded-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-mono text-[11px] text-slate-700 dark:text-slate-300">
                {col}
              </span>
            {/each}
          </div>
        </div>
      </div>

      <!-- Actions -->
      <div class="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3 shrink-0">
        <div>
          {#if report.totalInvalid > 0}
            <button
              type="button"
              onclick={handleFilterErrors}
              class="px-3 py-2 bg-amber-100 hover:bg-amber-200 dark:bg-amber-950 dark:hover:bg-amber-900 text-amber-900 dark:text-amber-200 rounded-lg text-xs font-semibold transition"
            >
              Afficher uniquement les {report.totalInvalid} lignes en erreur
            </button>
          {/if}
        </div>

        <div class="flex items-center gap-2">
          <button
            type="button"
            onclick={handleViewAll}
            class="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs transition"
          >
            Consulter les données
          </button>
        </div>
      </div>
    </div>
  </div>
{/if}
