<script lang="ts">
  import type { FieldRules, WysiwygFormat } from '../lib/types';
  import { extractRawText } from '../lib/validator';

  interface Props {
    value: string;
    format?: WysiwygFormat;
    rules: FieldRules;
    placeholder?: string;
    onchange: (val: string) => void;
  }

  let { value = '', format = 'html', rules, placeholder = 'Saisissez votre contenu...', onchange }: Props = $props();

  let isPreview = $state(false);
  let textareaEl: HTMLTextAreaElement | null = $state(null);

  let rawLength = $derived(extractRawText(value, format).length);

  let lengthStatus = $derived.by(() => {
    if (rules.min !== undefined && rawLength < rules.min) return 'under';
    if (rules.max !== undefined && rawLength > rules.max) return 'over';
    return 'ok';
  });

  function wrapSelection(before: string, after: string, defaultText = 'texte') {
    if (!textareaEl) return;
    const start = textareaEl.selectionStart;
    const end = textareaEl.selectionEnd;
    const current = textareaEl.value;

    const selected = current.substring(start, end) || defaultText;
    const replacement = `${before}${selected}${after}`;
    const nextVal = current.substring(0, start) + replacement + current.substring(end);

    onchange(nextVal);

    setTimeout(() => {
      if (textareaEl) {
        textareaEl.focus();
        textareaEl.setSelectionRange(start + before.length, start + before.length + selected.length);
      }
    }, 10);
  }

  function handleInsert(action: string) {
    if (format === 'html') {
      switch (action) {
        case 'bold':
          wrapSelection('<strong>', '</strong>', 'texte important');
          break;
        case 'italic':
          wrapSelection('<em>', '</em>', 'texte en italique');
          break;
        case 'h2':
          wrapSelection('<h2>', '</h2>', 'Titre de section');
          break;
        case 'h3':
          wrapSelection('<h3>', '</h3>', 'Sous-titre');
          break;
        case 'ul':
          wrapSelection('<ul>\n  <li>', '</li>\n  <li>Deuxième élément</li>\n</ul>', 'Premier élément');
          break;
        case 'ol':
          wrapSelection('<ol>\n  <li>', '</li>\n  <li>Étape suivante</li>\n</ol>', 'Première étape');
          break;
        case 'link': {
          const url = prompt('URL du lien (ex: https://monsite.fr) :', 'https://');
          if (url) {
            wrapSelection(`<a href="${url}">`, '</a>', 'texte du lien');
          }
          break;
        }
        case 'p':
          wrapSelection('<p>', '</p>', 'Nouveau paragraphe');
          break;
      }
    } else {
      // Mode Markdown
      switch (action) {
        case 'bold':
          wrapSelection('**', '**', 'texte important');
          break;
        case 'italic':
          wrapSelection('*', '*', 'texte en italique');
          break;
        case 'h2':
          wrapSelection('## ', '\n', 'Titre de section');
          break;
        case 'h3':
          wrapSelection('### ', '\n', 'Sous-titre');
          break;
        case 'ul':
          wrapSelection('- ', '\n- Deuxième élément', 'Premier élément');
          break;
        case 'ol':
          wrapSelection('1. ', '\n2. Étape suivante', 'Première étape');
          break;
        case 'link': {
          const url = prompt('URL du lien :', 'https://');
          if (url) {
            wrapSelection('[', `](${url})`, 'texte du lien');
          }
          break;
        }
      }
    }
  }

  function renderPreviewHtml(content: string, fmt: WysiwygFormat): string {
    if (!content) return '<p class="text-slate-400 italic">Aucun contenu saisi.</p>';
    if (fmt === 'html') {
      return content;
    } else {
      // Conversion markdown basique et sécurisée sans dépendance externe
      return content
        .replace(/^### (.*$)/gim, '<h3 class="text-base font-semibold mt-2 mb-1">$1</h3>')
        .replace(/^## (.*$)/gim, '<h2 class="text-lg font-bold mt-3 mb-1.5">$1</h2>')
        .replace(/^# (.*$)/gim, '<h1 class="text-xl font-extrabold mt-3 mb-2">$1</h1>')
        .replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/gim, '<em>$1</em>')
        .replace(/\[(.*?)\]\((.*?)\)/gim, '<a href="$2" class="text-indigo-600 underline" target="_blank" rel="noopener">$1</a>')
        .replace(/^\- (.*$)/gim, '<li>$1</li>')
        .replace(/(<li>.*<\/li>)/gims, '<ul class="list-disc pl-5 my-2">$1</ul>')
        .replace(/\n\n/gim, '</p><p class="mt-2">');
    }
  }
</script>

<div class="border border-slate-300 dark:border-slate-700 rounded-xl overflow-hidden bg-white dark:bg-slate-900 transition-colors focus-within:ring-2 focus-within:ring-indigo-500/50">
  <!-- Barre d'outils -->
  <div class="flex flex-wrap items-center justify-between gap-1 p-1.5 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300" role="toolbar" aria-label="Formatage du texte">
    <div class="flex items-center gap-1 flex-wrap">
      <button
        type="button"
        onclick={() => handleInsert('bold')}
        title="Gras"
        aria-label="Mettre en gras"
        class="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 font-bold w-7 h-7 flex items-center justify-center transition cursor-pointer focus-visible:ring-2 focus-visible:ring-indigo-500"
      >
        B
      </button>
      <button
        type="button"
        onclick={() => handleInsert('italic')}
        title="Italique"
        aria-label="Mettre en italique"
        class="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 italic w-7 h-7 flex items-center justify-center transition cursor-pointer focus-visible:ring-2 focus-visible:ring-indigo-500"
      >
        I
      </button>

      <div class="w-px h-4 bg-slate-300 dark:bg-slate-700 mx-0.5"></div>

      <button
        type="button"
        onclick={() => handleInsert('h2')}
        title="Titre H2"
        aria-label="Titre niveau 2"
        class="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 font-bold text-[11px] h-7 px-2 flex items-center justify-center transition cursor-pointer focus-visible:ring-2 focus-visible:ring-indigo-500"
      >
        H2
      </button>
      <button
        type="button"
        onclick={() => handleInsert('h3')}
        title="Titre H3"
        aria-label="Titre niveau 3"
        class="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 font-bold text-[11px] h-7 px-2 flex items-center justify-center transition cursor-pointer focus-visible:ring-2 focus-visible:ring-indigo-500"
      >
        H3
      </button>

      <div class="w-px h-4 bg-slate-300 dark:bg-slate-700 mx-0.5"></div>

      <button
        type="button"
        onclick={() => handleInsert('ul')}
        title="Liste à puces"
        aria-label="Liste à puces"
        class="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 w-7 h-7 flex items-center justify-center transition cursor-pointer focus-visible:ring-2 focus-visible:ring-indigo-500"
      >
        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>
      <button
        type="button"
        onclick={() => handleInsert('ol')}
        title="Liste ordonnée"
        aria-label="Liste ordonnée"
        class="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 w-7 h-7 flex items-center justify-center text-[10px] font-mono transition cursor-pointer focus-visible:ring-2 focus-visible:ring-indigo-500"
      >
        1.
      </button>
      <button
        type="button"
        onclick={() => handleInsert('link')}
        title="Insérer un lien"
        aria-label="Insérer un lien"
        class="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 w-7 h-7 flex items-center justify-center transition cursor-pointer focus-visible:ring-2 focus-visible:ring-indigo-500"
      >
        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
        </svg>
      </button>
    </div>

    <!-- Mode switch & Format indicator -->
    <div class="flex items-center gap-2">
      <span class="text-[10px] font-mono uppercase bg-slate-200 dark:bg-slate-700 px-1.5 py-0.5 rounded text-slate-600 dark:text-slate-300">
        {format}
      </span>
      <button
        type="button"
        onclick={() => (isPreview = !isPreview)}
        class="px-2.5 py-1 rounded bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 text-xs font-medium transition cursor-pointer focus-visible:ring-2 focus-visible:ring-indigo-500"
      >
        {isPreview ? 'Éditer' : 'Aperçu'}
      </button>
    </div>
  </div>

  <!-- Contenu : Édition ou Aperçu -->
  {#if isPreview}
    <div class="p-3 min-h-[140px] max-h-[300px] overflow-y-auto text-sm leading-relaxed prose prose-sm dark:prose-invert">
      {@html renderPreviewHtml(value, format)}
    </div>
  {:else}
    <textarea
      bind:this={textareaEl}
      value={value}
      oninput={(e) => onchange((e.target as HTMLTextAreaElement).value)}
      {placeholder}
      rows="5"
      class="w-full p-3 bg-transparent text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none resize-y font-mono"
    ></textarea>
  {/if}

  <!-- Footer compteur de caractères & jauge -->
  <div class="px-3 py-1.5 bg-slate-50 dark:bg-slate-800/40 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
    <div class="flex items-center gap-2">
      <span class="font-medium">
        Texte brut : <span class={lengthStatus === 'under' ? 'text-amber-600 dark:text-amber-400 font-semibold' : lengthStatus === 'over' ? 'text-rose-600 dark:text-rose-400 font-semibold' : 'text-emerald-600 dark:text-emerald-400 font-semibold'}>
          {rawLength}
        </span>
        {#if rules.min !== undefined || rules.max !== undefined}
          <span class="text-slate-400">
            ({rules.min !== undefined ? `min ${rules.min}` : ''}{rules.min && rules.max ? ', ' : ''}{rules.max !== undefined ? `max ${rules.max}` : ''})
          </span>
        {/if}
      </span>
    </div>

    <!-- Petit indicateur visuel de validité -->
    {#if lengthStatus === 'ok'}
      <span class="text-emerald-600 dark:text-emerald-400 flex items-center gap-1 text-[11px]">
        <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
        </svg>
        Longueur conforme
      </span>
    {:else if lengthStatus === 'under'}
      <span class="text-amber-600 dark:text-amber-400 text-[11px]">
        +{rules.min! - rawLength} car. requis
      </span>
    {:else}
      <span class="text-rose-600 dark:text-rose-400 text-[11px]">
        -{rawLength - rules.max!} car. en trop
      </span>
    {/if}
  </div>
</div>
