<script lang="ts">
  import { FIELD_TYPE_METAS, type FieldType } from '../lib/types';

  interface Props {
    selectedType: FieldType;
    onchange: (type: FieldType) => void;
    id?: string;
  }

  let { selectedType, onchange, id }: Props = $props();

  let isOpen = $state(false);
  let activeCategory = $state<'all' | 'text' | 'choice' | 'advanced'>('all');
  let containerEl: HTMLDivElement | null = $state(null);

  const allTypes: FieldType[] = [
    'text',
    'textarea',
    'wysiwyg',
    'slug',
    'boolean',
    'number',
    'select',
    'multiselect'
  ];

  let filteredTypes = $derived(
    activeCategory === 'all'
      ? allTypes
      : allTypes.filter((t) => FIELD_TYPE_METAS[t].category === activeCategory)
  );

  let currentMeta = $derived(FIELD_TYPE_METAS[selectedType] || FIELD_TYPE_METAS.text);

  function handleSelect(type: FieldType) {
    onchange(type);
    isOpen = false;
  }

  function handleDocumentClick(e: MouseEvent) {
    if (containerEl && !containerEl.contains(e.target as Node)) {
      isOpen = false;
    }
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === 'Escape' && isOpen) {
      isOpen = false;
    }
  }
</script>

<svelte:window onclick={handleDocumentClick} onkeydown={handleKeyDown} />

<div class="relative" bind:this={containerEl}>
  <!-- Bouton déclencheur avec emoji et libellé -->
  <button
    type="button"
    {id}
    onclick={() => (isOpen = !isOpen)}
    aria-haspopup="listbox"
    aria-expanded={isOpen}
    class="w-full flex items-center justify-between gap-2.5 px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 hover:border-indigo-400 dark:hover:border-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition shadow-2xs text-left"
  >
    <div class="flex items-center gap-2 truncate">
      <span class="text-base shrink-0 leading-none" role="img" aria-label={currentMeta.label}>
        {currentMeta.emoji}
      </span>
      <div class="truncate">
        <span class="font-bold text-xs">{currentMeta.label}</span>
        <span class="text-[11px] text-slate-400 font-mono ml-1.5">({currentMeta.shortLabel})</span>
      </div>
    </div>

    <svg class="w-4 h-4 text-slate-400 shrink-0 transition-transform {isOpen ? 'rotate-180' : ''}" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
    </svg>
  </button>

  <!-- Menu déroulant visuel avec onglets de catégorie -->
  {#if isOpen}
    <div
      class="absolute left-0 right-0 sm:right-auto sm:w-96 mt-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl p-2 z-50 animate-in fade-in zoom-in-95"
      role="listbox"
    >
      <!-- Onglets de filtrage par famille de données -->
      <div class="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl mb-2 text-[11px] font-medium text-slate-600 dark:text-slate-300" role="tablist" aria-label="Filtrer les types par catégorie">
        <button
          type="button"
          role="tab"
          aria-selected={activeCategory === 'all'}
          onclick={() => (activeCategory = 'all')}
          class="flex-1 py-1 rounded-lg text-center transition cursor-pointer focus-visible:ring-2 focus-visible:ring-indigo-500
            {activeCategory === 'all' ? 'bg-white dark:bg-slate-900 font-bold text-indigo-600 dark:text-indigo-400 shadow-2xs' : 'hover:text-slate-900 dark:hover:text-white'}"
        >
          Tous
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeCategory === 'text'}
          onclick={() => (activeCategory = 'text')}
          class="flex-1 py-1 rounded-lg text-center transition cursor-pointer focus-visible:ring-2 focus-visible:ring-indigo-500
            {activeCategory === 'text' ? 'bg-white dark:bg-slate-900 font-bold text-indigo-600 dark:text-indigo-400 shadow-2xs' : 'hover:text-slate-900 dark:hover:text-white'}"
        >
          ✍️ Texte
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeCategory === 'choice'}
          onclick={() => (activeCategory = 'choice')}
          class="flex-1 py-1 rounded-lg text-center transition cursor-pointer focus-visible:ring-2 focus-visible:ring-indigo-500
            {activeCategory === 'choice' ? 'bg-white dark:bg-slate-900 font-bold text-indigo-600 dark:text-indigo-400 shadow-2xs' : 'hover:text-slate-900 dark:hover:text-white'}"
        >
          🔘 Choix
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeCategory === 'advanced'}
          onclick={() => (activeCategory = 'advanced')}
          class="flex-1 py-1 rounded-lg text-center transition cursor-pointer focus-visible:ring-2 focus-visible:ring-indigo-500
            {activeCategory === 'advanced' ? 'bg-white dark:bg-slate-900 font-bold text-indigo-600 dark:text-indigo-400 shadow-2xs' : 'hover:text-slate-900 dark:hover:text-white'}"
        >
          ⚙️ Spécial
        </button>
      </div>

      <!-- Liste des types avec emojis et explications -->
      <div class="space-y-1 max-h-64 overflow-y-auto pr-0.5">
        {#each filteredTypes as type}
          {@const meta = FIELD_TYPE_METAS[type]}
          {@const isSelected = selectedType === type}
          <button
            type="button"
            role="option"
            aria-selected={isSelected}
            onclick={() => handleSelect(type)}
            class="w-full text-left p-2.5 rounded-xl transition flex items-start justify-between gap-2.5 cursor-pointer focus-visible:ring-2 focus-visible:ring-indigo-500
              {isSelected
                ? 'bg-indigo-50/80 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800'
                : 'hover:bg-slate-50 dark:hover:bg-slate-800/70 border border-transparent'}"
          >
            <div class="flex items-start gap-2.5 min-w-0">
              <span class="text-xl shrink-0 mt-0.5" role="img" aria-hidden="true">
                {meta.emoji}
              </span>
              <div class="min-w-0">
                <div class="flex items-center gap-1.5">
                  <span class="font-bold text-xs text-slate-900 dark:text-white truncate">
                    {meta.label}
                  </span>
                  <span class="px-1.5 py-0.2 rounded text-[10px] font-mono bg-slate-100 dark:bg-slate-800 text-slate-500">
                    {meta.shortLabel}
                  </span>
                </div>
                <p class="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">
                  {meta.description}
                </p>
              </div>
            </div>

            {#if isSelected}
              <span class="text-indigo-600 dark:text-indigo-400 font-black text-sm shrink-0 mt-0.5">
                ✓
              </span>
            {/if}
          </button>
        {/each}
      </div>
    </div>
  {/if}
</div>
