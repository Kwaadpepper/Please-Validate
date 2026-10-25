<script lang="ts">
  import { appState } from '../lib/storage.svelte';
  import { encodeTemplateToHash, exportPleaseFile } from '../lib/codec';

  interface Props {
    isOpen: boolean;
    onClose: () => void;
  }

  let { isOpen, onClose }: Props = $props();

  let copied = $state(false);

  let isLocalFile = $derived(
    typeof window !== 'undefined' &&
      (window.location.protocol === 'file:' || !window.location.origin || window.location.origin === 'null')
  );

  let shareableUrl = $derived.by(() => {
    if (typeof window === 'undefined') return '';
    try {
      const hash = encodeTemplateToHash(appState.currentTemplate);
      if (isLocalFile) {
        // En protocole file://, window.location.origin vaut "null" dans les navigateurs
        const cleanBase = window.location.href.split('#')[0];
        return `${cleanBase}#p=${hash}`;
      } else {
        const origin = window.location.origin.replace(/\/$/, '');
        const path = window.location.pathname.startsWith('/') ? window.location.pathname : `/${window.location.pathname}`;
        return `${origin}${path}#p=${hash}`;
      }
    } catch {
      return '';
    }
  });

  async function handleCopy() {
    if (!shareableUrl) return;
    try {
      await navigator.clipboard.writeText(shareableUrl);
      copied = true;
      appState.showToast('Lien du gabarit copié dans le presse-papier !', 'success');
      setTimeout(() => (copied = false), 2500);
    } catch (e) {
      appState.showToast('Impossible de copier automatiquement. Veuillez sélectionner le texte.', 'error');
    }
  }

  function handleDownloadPlease() {
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
</script>

{#if isOpen}
  <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
    <div
      class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-xl w-full p-6 text-slate-800 dark:text-slate-100 space-y-5"
      role="dialog"
      aria-modal="true"
      aria-labelledby="share-modal-title"
    >
      <div class="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
        <div class="flex items-center gap-2">
          <div class="p-2 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-lg">
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
          </div>
          <h2 id="share-modal-title" class="text-lg font-bold">Partager le gabarit « {appState.currentTemplate.name} »</h2>
        </div>
        <button
          type="button"
          onclick={onClose}
          class="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg"
          aria-label="Fermer"
        >
          <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div class="space-y-4 text-sm">
        <p class="text-slate-600 dark:text-slate-400">
          Ce lien contient la spécification complète de vos champs et règles de validation (versionnée <span class="font-mono bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded text-xs font-bold">v1</span>). N’importe qui ouvrant ce lien dispose immédiatement de l’interface de saisie sans avoir besoin de compte.
        </p>

        <!-- Message d'aide si utilisation en local file:// -->
        {#if isLocalFile}
          <div class="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-xs space-y-1">
            <span class="font-bold block">💡 Mode fichier local autonome (file://) :</span>
            <p>
              Le lien ci-dessous ouvre directement ce fichier HTML sur votre poste. Pour transmettre ce gabarit à des collaborateurs distants, le plus simple est de leur envoyer le fichier <strong class="font-mono">.please</strong> (bouton ci-dessous) ou d'héberger ce fichier HTML sur un serveur web / intranet.
            </p>
          </div>
        {/if}

        <!-- Champ URL -->
        <div class="space-y-1.5">
          <label for="share-url-input" class="block font-medium text-xs uppercase tracking-wider text-slate-500">
            Lien permanent autonome
          </label>
          <div class="flex items-center gap-2">
            <input
              id="share-url-input"
              type="text"
              readonly
              value={shareableUrl}
              class="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-slate-700 dark:text-slate-300 focus:outline-none select-all"
            />
            <button
              type="button"
              onclick={handleCopy}
              class="px-4 py-2 shrink-0 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium text-xs flex items-center gap-1.5 transition"
            >
              {#if copied}
                <svg class="w-4 h-4 text-emerald-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                </svg>
                <span>Copié !</span>
              {:else}
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                </svg>
                <span>Copier</span>
              {/if}
            </button>
          </div>
        </div>

        <div class="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div>
            <span class="font-medium text-xs text-slate-700 dark:text-slate-300 block">Fichier de configuration portable</span>
            <span class="text-xs text-slate-500">Pour archiver ou transmettre par email</span>
          </div>
          <button
            type="button"
            onclick={handleDownloadPlease}
            class="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-lg text-xs font-medium flex items-center gap-1.5 transition"
          >
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            <span>Télécharger .please</span>
          </button>
        </div>
      </div>

      <div class="pt-3 flex justify-end">
        <button
          type="button"
          onclick={onClose}
          class="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-semibold transition"
        >
          Fermer
        </button>
      </div>
    </div>
  </div>
{/if}
