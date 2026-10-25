<script lang="ts">
  import { appState } from '../lib/storage.svelte';
</script>

{#if appState.toastMessage}
  <div
    class="fixed bottom-5 right-5 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-xl text-sm font-medium transition-all duration-300 animate-in fade-in slide-in-from-bottom-2
      {appState.toastType === 'success' ? 'bg-emerald-600 text-white shadow-emerald-950/20' : ''}
      {appState.toastType === 'error' ? 'bg-rose-600 text-white shadow-rose-950/20' : ''}
      {appState.toastType === 'warning' ? 'bg-amber-500 text-slate-950 shadow-amber-950/20' : ''}
      {appState.toastType === 'info' ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-slate-950/30' : ''}"
    role="status"
    aria-live="polite"
  >
    {#if appState.toastType === 'success'}
      <svg class="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
      </svg>
    {:else if appState.toastType === 'error'}
      <svg class="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
      </svg>
    {:else if appState.toastType === 'warning'}
      <svg class="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    {:else}
      <svg class="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    {/if}

    <span>{appState.toastMessage}</span>

    <button
      type="button"
      onclick={() => (appState.toastMessage = null)}
      class="ml-2 opacity-70 hover:opacity-100 transition"
      aria-label="Fermer"
    >
      <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
      </svg>
    </button>
  </div>
{/if}
