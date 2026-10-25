<script lang="ts">
  import { onMount } from 'svelte';
  import { appState } from './lib/storage.svelte';
  import Header from './components/Header.svelte';
  import FillerView from './components/FillerView.svelte';
  import BuilderView from './components/BuilderView.svelte';
  import Toast from './components/Toast.svelte';
  import CsvImportReportModal from './components/CsvImportReportModal.svelte';

  onMount(() => {
    appState.init();
  });
</script>

<div class="min-h-screen flex flex-col bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
  <Header />

  <main class="flex-1">
    {#if appState.viewMode === 'filler'}
      <FillerView />
    {:else}
      <BuilderView />
    {/if}
  </main>

  <footer class="py-6 border-t border-slate-200 dark:border-slate-800 text-center text-xs text-slate-400">
    <p>Please Validate — Application autonome 100% hors-ligne. Vos données restent dans votre navigateur.</p>
  </footer>

  <Toast />

  <CsvImportReportModal
    isOpen={appState.isImportReportModalOpen}
    onClose={() => (appState.isImportReportModalOpen = false)}
  />
</div>
