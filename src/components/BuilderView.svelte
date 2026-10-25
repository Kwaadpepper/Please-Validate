<script lang="ts">
  import { appState } from '../lib/storage.svelte';
  import { CLASSIC_PRESETS, generateUniqueId, generateUniqueKey } from '../lib/presets';
  import { FIELD_TYPE_METAS, type FieldDefinition, type FieldType } from '../lib/types';
  import { slugify } from '../lib/slug';
  import { exportPleaseFile } from '../lib/codec';
  import FieldTypePicker from './FieldTypePicker.svelte';

  // Copie de travail locale du gabarit
  let templateName = $state(appState.currentTemplate.name);
  let templateDescription = $state(appState.currentTemplate.description || '');
  let fields = $state<FieldDefinition[]>(JSON.parse(JSON.stringify(appState.currentTemplate.fields)));

  let showJsonPreview = $state(false);
  let nameError = $derived(templateName.trim() === '' ? 'Le nom du gabarit est obligatoire.' : null);

  // Gestion des champs dépliés / repliés (Accordion) pour réduire la charge mentale
  let expandedFieldIds = $state<Record<string, boolean>>({});

  // Gestion des onglets par champ : 'editorial' vs 'technical'
  let activeTabByField = $state<Record<string, 'editorial' | 'technical'>>({});

  function getFieldTab(fieldId: string): 'editorial' | 'technical' {
    return activeTabByField[fieldId] || 'editorial';
  }

  function setFieldTab(fieldId: string, tab: 'editorial' | 'technical') {
    activeTabByField = { ...activeTabByField, [fieldId]: tab };
  }

  function toggleFieldExpanded(fieldId: string) {
    expandedFieldIds = {
      ...expandedFieldIds,
      [fieldId]: !expandedFieldIds[fieldId]
    };
  }

  function expandAll() {
    const next: Record<string, boolean> = {};
    fields.forEach((f) => (next[f.id] = true));
    expandedFieldIds = next;
  }

  function collapseAll() {
    expandedFieldIds = {};
  }

  let areAllExpanded = $derived(
    fields.length > 0 && fields.every((f) => expandedFieldIds[f.id])
  );

  // Synchroniser si le gabarit change depuis le store
  $effect(() => {
    templateName = appState.currentTemplate.name;
    templateDescription = appState.currentTemplate.description || '';
    fields = JSON.parse(JSON.stringify(appState.currentTemplate.fields));
  });

  function saveCurrent() {
    if (nameError) {
      appState.showToast(nameError, 'error');
      return;
    }
    appState.saveTemplate({
      ...appState.currentTemplate,
      name: templateName.trim(),
      description: templateDescription.trim(),
      fields
    });
  }

  function handleSaveAndSwitch() {
    saveCurrent();
    if (!nameError) {
      appState.viewMode = 'filler';
    }
  }

  function handleExportPlease() {
    saveCurrent();
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
      appState.showToast('Impossible de supprimer le seul gabarit restant.', 'warning');
      return;
    }
    if (confirm(`Supprimer définitivement le gabarit « ${appState.currentTemplate.name} » ?`)) {
      appState.deleteTemplate(appState.currentTemplate.id);
    }
  }

  function addClassicPreset(presetId: string) {
    const preset = CLASSIC_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;

    const existingKeys = fields.map((f) => f.key);
    const newFields = preset.createFields(existingKeys);
    fields = [...fields, ...newFields];
    // Déplier le premier nouveau champ ajouté
    if (newFields.length > 0) {
      expandedFieldIds = { ...expandedFieldIds, [newFields[0].id]: true };
    }
    saveCurrent();
    appState.showToast(`Preset « ${preset.name} » ajouté.`, 'info');
  }

  function addCustomField() {
    const existingKeys = fields.map((f) => f.key);
    const key = generateUniqueKey('custom_field', existingKeys);

    const newField: FieldDefinition = {
      id: generateUniqueId(),
      key,
      label: 'Nouveau champ',
      type: 'text',
      helpText: '',
      rules: { required: false, nullable: true }
    };

    fields = [...fields, newField];
    expandedFieldIds = { ...expandedFieldIds, [newField.id]: true };
    saveCurrent();
    appState.showToast('Champ personnalisé ajouté.', 'info');
  }

  function moveField(index: number, direction: 'up' | 'down') {
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= fields.length) return;

    const copy = [...fields];
    const [moved] = copy.splice(index, 1);
    copy.splice(targetIdx, 0, moved);
    fields = copy;
    saveCurrent();
  }

  function duplicateField(index: number) {
    const src = fields[index];
    const existingKeys = fields.map((f) => f.key);
    const key = generateUniqueKey(`${src.key}_copie`, existingKeys);

    const clone: FieldDefinition = {
      ...JSON.parse(JSON.stringify(src)),
      id: generateUniqueId(),
      key,
      label: `${src.label} (copie)`
    };

    const copy = [...fields];
    copy.splice(index + 1, 0, clone);
    fields = copy;
    expandedFieldIds = { ...expandedFieldIds, [clone.id]: true };
    saveCurrent();
    appState.showToast(`Champ « ${clone.label} » dupliqué.`, 'info');
  }

  function removeField(index: number) {
    if (fields.length <= 1) {
      appState.showToast('Un gabarit doit comporter au moins un champ.', 'warning');
      return;
    }
    const removedLabel = fields[index].label;
    fields = fields.filter((_, i) => i !== index);
    saveCurrent();
    appState.showToast(`Champ « ${removedLabel} » supprimé.`, 'info');
  }

  function handleLabelBlur(field: FieldDefinition) {
    if (!field.key || field.key.startsWith('custom_field')) {
      const existing = fields.filter((f) => f.id !== field.id).map((f) => f.key);
      field.key = generateUniqueKey(slugify(field.label).replace(/-/g, '_'), existing) || 'field';
      saveCurrent();
    }
  }

  function handleTypeChange(field: FieldDefinition, newType: FieldType) {
    field.type = newType;
    if (newType === 'slug' && !field.sourceFieldKey) {
      const firstTextField = fields.find((f) => f.id !== field.id && (f.type === 'text' || f.type === 'textarea'));
      if (firstTextField) field.sourceFieldKey = firstTextField.key;
    }
    if (newType === 'wysiwyg' && !field.wysiwygFormat) {
      field.wysiwygFormat = 'html';
    }
    if ((newType === 'select' || newType === 'multiselect') && (!field.options || field.options.length === 0)) {
      field.options = ['Option 1', 'Option 2'];
    }
    saveCurrent();
  }

  function addOption(field: FieldDefinition) {
    if (!field.options) field.options = [];
    const val = prompt('Nouvelle option :');
    if (val && val.trim()) {
      field.options.push(val.trim());
      saveCurrent();
    }
  }

  function removeOption(field: FieldDefinition, optIdx: number) {
    if (!field.options) return;
    field.options.splice(optIdx, 1);
    saveCurrent();
  }
</script>

<div class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 animate-in fade-in">
  <!-- 1. En-tête éditeur de gabarit & Métadonnées -->
  <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-2xs space-y-4">
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3.5 border-b border-slate-100 dark:border-slate-800">
      <div>
        <h1 class="text-lg font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
          <span>Structure du gabarit</span>
          <span class="px-2 py-0.5 rounded-full text-xs font-mono font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
            {fields.length} champs
          </span>
        </h1>
        <p class="text-xs text-slate-500 mt-0.5">
          Définissez les règles éditoriales pour vos rédacteurs et les contraintes techniques pour l’export CMS.
        </p>
      </div>

      <div class="flex items-center gap-2 flex-wrap">
        <button
          type="button"
          onclick={handleExportPlease}
          title="Exporter ce gabarit au format portable (.please)"
          class="h-8 px-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-medium flex items-center gap-1.5 transition"
        >
          <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          <span class="hidden sm:inline">Exporter .please</span>
        </button>

        {#if appState.templatesLibrary.length > 1}
          <button
            type="button"
            onclick={handleDeleteCurrentTemplate}
            title="Supprimer ce gabarit de la liste"
            class="h-8 px-2.5 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 text-rose-600 dark:text-rose-400 rounded-xl text-xs font-medium flex items-center gap-1 transition"
          >
            <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            <span class="hidden sm:inline">Supprimer</span>
          </button>
        {/if}

        <button
          type="button"
          onclick={handleSaveAndSwitch}
          class="h-8 px-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-xs transition"
        >
          <span>Aller à la saisie</span>
          <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
          </svg>
        </button>
      </div>
    </div>

    <!-- Métadonnées principales du gabarit -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-3.5">
      <div>
        <label for="template-name-input" class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
          Nom du gabarit <span class="text-rose-500">*</span>
        </label>
        <input
          id="template-name-input"
          type="text"
          bind:value={templateName}
          onblur={saveCurrent}
          placeholder="Ex: Fiches Produits, Articles de Blog, Landing Pages..."
          class="w-full px-3 py-2 rounded-xl border text-xs bg-slate-50 dark:bg-slate-950 font-semibold text-slate-900 dark:text-slate-100 transition focus:outline-none focus:ring-2 focus:ring-indigo-500
            {nameError ? 'border-rose-400 focus:ring-rose-400' : 'border-slate-200 dark:border-slate-800'}"
        />
        {#if nameError}
          <p class="text-[11px] text-rose-500 mt-1">{nameError}</p>
        {/if}
      </div>

      <div>
        <label for="template-desc-input" class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
          Consigne éditoriale générale <span class="text-slate-400 font-normal">(optionnel)</span>
        </label>
        <input
          id="template-desc-input"
          type="text"
          bind:value={templateDescription}
          onblur={saveCurrent}
          placeholder="Ex: Remplir tous les champs avant export vers WordPress / Strapi."
          class="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-xs bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>
    </div>
  </div>

  <!-- 2. Catalogue de Champs Classiques (Ajout en 1 clic avec emojis) -->
  <div class="bg-gradient-to-r from-indigo-50/60 to-purple-50/60 dark:from-indigo-950/20 dark:to-purple-950/20 border border-indigo-100 dark:border-indigo-900/40 rounded-2xl p-4 space-y-2.5">
    <div class="flex items-center justify-between gap-2 flex-wrap">
      <div class="flex items-center gap-2">
        <span class="text-xs font-bold text-indigo-900 dark:text-indigo-300">
          ⚡ Champs classiques (Catalogue en 1 clic)
        </span>
        <span class="text-[11px] text-slate-500 dark:text-slate-400 hidden sm:inline">
          Modèles pré-configurés avec règles SEO et CMS
        </span>
      </div>

      <button
        type="button"
        onclick={addCustomField}
        class="px-2.5 py-1 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 rounded-lg text-xs font-semibold flex items-center gap-1 shadow-2xs transition"
      >
        <span>+ ⚙️ Champ personnalisé</span>
      </button>
    </div>

    <!-- Puces interactives avec emojis -->
    <div class="flex flex-wrap gap-1.5">
      {#each CLASSIC_PRESETS as preset}
        <button
          type="button"
          onclick={() => addClassicPreset(preset.id)}
          title={preset.description}
          class="px-2.5 py-1 bg-white dark:bg-slate-900 hover:bg-indigo-600 hover:text-white dark:hover:bg-indigo-600 dark:hover:text-white text-slate-700 dark:text-slate-200 border border-indigo-200/70 dark:border-indigo-800/70 rounded-xl text-xs font-medium shadow-2xs transition flex items-center gap-1.5 group"
        >
          <span class="text-sm shrink-0">{preset.emoji}</span>
          <span class="text-[11px]">{preset.name}</span>
        </button>
      {/each}
    </div>
  </div>

  <!-- 3. Liste des champs avec Accordion & Onglets Éditorial / Technique -->
  <div class="space-y-3">
    <!-- Contrôles de vue de liste -->
    <div class="flex items-center justify-between gap-2 px-1">
      <div class="flex items-center gap-3">
        <h2 class="text-sm font-extrabold text-slate-900 dark:text-white">
          Champs du gabarit ({fields.length})
        </h2>
        <!-- Bascule Tout Déplier / Tout Replier -->
        <button
          type="button"
          onclick={() => (areAllExpanded ? collapseAll() : expandAll())}
          class="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
        >
          {areAllExpanded ? 'Tout replier' : 'Tout déplier'}
        </button>
      </div>

      <button
        type="button"
        onclick={() => (showJsonPreview = !showJsonPreview)}
        class="text-xs text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 font-medium transition"
      >
        {showJsonPreview ? 'Masquer le JSON' : 'Voir le schéma JSON'}
      </button>
    </div>

    {#if showJsonPreview}
      <div class="bg-slate-900 text-slate-200 rounded-xl p-4 font-mono text-xs overflow-x-auto max-h-60 border border-slate-800 animate-in fade-in">
        <pre>{JSON.stringify({ schemaVersion: 1, name: templateName, fields }, null, 2)}</pre>
      </div>
    {/if}

    <!-- Cartes Accordion des champs -->
    <div class="space-y-2.5">
      {#each fields as field, index (field.id)}
        {@const isExpanded = expandedFieldIds[field.id] ?? (index === 0)}
        {@const currentTab = getFieldTab(field.id)}
        {@const meta = FIELD_TYPE_METAS[field.type] || FIELD_TYPE_METAS.text}

        <div class="bg-white dark:bg-slate-900 border rounded-2xl shadow-2xs transition
          {isExpanded
            ? 'border-indigo-300 dark:border-indigo-700/80 ring-2 ring-indigo-500/10'
            : 'border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'}">
          
          <!-- En-tête compacte toujours visible de la carte -->
          <div
            role="button"
            tabindex="0"
            onclick={() => toggleFieldExpanded(field.id)}
            onkeydown={(e) => e.key === 'Enter' && toggleFieldExpanded(field.id)}
            class="px-4 py-3 flex items-center justify-between gap-3 cursor-pointer select-none"
          >
            <!-- Gauche : Emoji, Numéro, Libellé & Badges informatifs -->
            <div class="flex items-center gap-2.5 min-w-0">
              <span class="w-6 h-6 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-mono font-bold flex items-center justify-center shrink-0">
                {index + 1}
              </span>

              <span class="text-base shrink-0" role="img" aria-label={meta.label}>
                {meta.emoji}
              </span>

              <span class="font-bold text-xs text-slate-900 dark:text-white truncate">
                {field.label || 'Champ sans libellé'}
              </span>

              <!-- Badge du type avec emoji -->
              <span class="px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 shrink-0 hidden sm:inline-flex items-center gap-1">
                <span>{meta.emoji}</span>
                <span>{meta.label}</span>
              </span>

              <!-- Clé CSV -->
              <span class="text-[11px] text-slate-400 font-mono shrink-0 hidden md:inline">
                col: <code class="text-indigo-600 dark:text-indigo-400 font-bold">{field.key}</code>
              </span>

              <!-- Contrainte rapide -->
              {#if field.rules.required}
                <span class="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300 shrink-0 hidden lg:inline">
                  Requis
                </span>
              {:else}
                <span class="px-1.5 py-0.2 rounded text-[10px] font-medium text-slate-400 shrink-0 hidden lg:inline">
                  Optionnel
                </span>
              {/if}
            </div>

            <!-- Droite : Actions de réorganisation & Chevron déplier/replier -->
            <div class="flex items-center gap-1 shrink-0" role="group" aria-label="Actions sur le champ">
              <button
                type="button"
                disabled={index === 0}
                onclick={(e) => {
                  e.stopPropagation();
                  moveField(index, 'up');
                }}
                title="Déplacer vers le haut"
                class="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 disabled:opacity-20 transition"
              >
                <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7" />
                </svg>
              </button>

              <button
                type="button"
                disabled={index === fields.length - 1}
                onclick={(e) => {
                  e.stopPropagation();
                  moveField(index, 'down');
                }}
                title="Déplacer vers le bas"
                class="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 disabled:opacity-20 transition"
              >
                <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              <button
                type="button"
                onclick={(e) => {
                  e.stopPropagation();
                  duplicateField(index);
                }}
                title="Dupliquer ce champ"
                class="p-1 rounded text-slate-400 hover:text-indigo-600 transition"
              >
                <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </button>

              <button
                type="button"
                onclick={(e) => {
                  e.stopPropagation();
                  removeField(index);
                }}
                title="Supprimer ce champ"
                class="p-1 rounded text-slate-400 hover:text-rose-600 transition"
              >
                <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>

              <!-- Chevron pour déplier / replier -->
              <button
                type="button"
                onclick={(e) => {
                  e.stopPropagation();
                  toggleFieldExpanded(field.id);
                }}
                title={isExpanded ? 'Replier ce champ' : 'Déplier ce champ'}
                class="p-1 rounded text-slate-400 hover:text-indigo-600 ml-1 transition"
              >
                <svg class="w-4 h-4 transition-transform {isExpanded ? 'rotate-180' : ''}" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            </div>
          </div>

          <!-- Contenu de configuration déplié (Avec Onglets Éditorial vs Technique) -->
          {#if isExpanded}
            <div class="px-5 pb-5 pt-1 border-t border-slate-100 dark:border-slate-800 space-y-4 animate-in fade-in">
              <!-- Système d'onglets pour alléger la charge mentale -->
              <div class="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs font-semibold max-w-sm">
                <button
                  type="button"
                  onclick={() => setFieldTab(field.id, 'editorial')}
                  class="flex-1 py-1.5 rounded-lg text-center flex items-center justify-center gap-1.5 transition
                    {currentTab === 'editorial'
                      ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-2xs font-bold'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}"
                >
                  <span>✍️</span>
                  <span>Éditorial</span>
                </button>

                <button
                  type="button"
                  onclick={() => setFieldTab(field.id, 'technical')}
                  class="flex-1 py-1.5 rounded-lg text-center flex items-center justify-center gap-1.5 transition
                    {currentTab === 'technical'
                      ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-2xs font-bold'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}"
                >
                  <span>⚙️</span>
                  <span>Technique & Règles</span>
                </button>
              </div>

              <!-- ONGLET 1 : ÉDITORIAL (Simple et calme, 2 inputs seulement) -->
              {#if currentTab === 'editorial'}
                <div class="space-y-3.5 pt-1 animate-in fade-in">
                  <div>
                    <label for={`field-label-${field.id}`} class="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                      Libellé affiché à l'utilisateur <span class="text-rose-500">*</span>
                    </label>
                    <input
                      id={`field-label-${field.id}`}
                      type="text"
                      bind:value={field.label}
                      onblur={() => handleLabelBlur(field)}
                      placeholder="Ex: Titre de l'article, Résumé, Catégorie..."
                      class="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs font-semibold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <p class="text-[11px] text-slate-400 mt-1">
                      Nom du champ tel qu'il apparaîtra dans le formulaire pour l'équipe de rédaction.
                    </p>
                  </div>

                  <div>
                    <label for={`field-help-${field.id}`} class="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                      Consigne éditoriale ou guide de rédaction <span class="text-slate-400 font-normal">(optionnel)</span>
                    </label>
                    <input
                      id={`field-help-${field.id}`}
                      type="text"
                      bind:value={field.helpText}
                      onblur={saveCurrent}
                      placeholder="Ex: Rédigez un titre percutant destiné aux moteurs de recherche..."
                      class="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <p class="text-[11px] text-slate-400 mt-1">
                      Instructions contextuelles affichées sous l'input pour guider la saisie.
                    </p>
                  </div>
                </div>

              <!-- ONGLET 2 : TECHNIQUE & RÈGLES (Configuré avec FieldTypePicker et contraintes) -->
              {:else}
                <div class="space-y-4 pt-1 animate-in fade-in">
                  <!-- Ligne 1 : Clé CSV & Sélecteur de type visuel avec emojis -->
                  <div class="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label for={`field-key-${field.id}`} class="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                        Clé colonne CSV <span class="text-rose-500">*</span>
                      </label>
                      <input
                        id={`field-key-${field.id}`}
                        type="text"
                        bind:value={field.key}
                        onblur={saveCurrent}
                        placeholder="Ex: title, seo_description, category..."
                        class="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 font-mono text-xs font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                      <p class="text-[11px] text-slate-400 mt-1">
                        Nom d'en-tête de la colonne dans le fichier CSV exporté vers le CMS.
                      </p>
                    </div>

                    <div>
                      <span class="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                        Type de données
                      </span>
                      <!-- Sélecteur personnalisé avec emojis (remplace le select natif) -->
                      <FieldTypePicker
                        id={`field-type-picker-${field.id}`}
                        selectedType={field.type}
                        onchange={(newType) => handleTypeChange(field, newType)}
                      />
                      <p class="text-[11px] text-slate-400 mt-1">
                        Définit le composant de saisie et le comportement de validation.
                      </p>
                    </div>
                  </div>

                  <!-- Options spécifiques selon le type -->
                  {#if field.type === 'slug'}
                    <div class="p-3 bg-indigo-50/50 dark:bg-indigo-950/30 rounded-xl text-xs space-y-1.5 border border-indigo-100 dark:border-indigo-900/50">
                      <label for={`field-source-${field.id}`} class="block font-bold text-slate-800 dark:text-slate-200">
                        🔗 Champ source pour la génération du slug :
                      </label>
                      <select
                        id={`field-source-${field.id}`}
                        bind:value={field.sourceFieldKey}
                        onchange={saveCurrent}
                        class="w-full sm:w-80 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                      >
                        <option value="">-- Aucun (slug libre) --</option>
                        {#each fields.filter((f) => f.id !== field.id && (f.type === 'text' || f.type === 'textarea')) as otherField}
                          <option value={otherField.key}>
                            {FIELD_TYPE_METAS[otherField.type]?.emoji || '📝'} {otherField.label} ({otherField.key})
                          </option>
                        {/each}
                      </select>
                      <p class="text-[11px] text-slate-500">
                        Le slug sera calculé automatiquement en temps réel et restera en lecture seule lors de la saisie.
                      </p>
                    </div>
                  {:else if field.type === 'wysiwyg'}
                    <div class="p-3 bg-purple-50/50 dark:bg-purple-950/30 rounded-xl text-xs space-y-1.5 border border-purple-100 dark:border-purple-900/50">
                      <span class="block font-bold text-slate-800 dark:text-slate-200">
                        ✨ Format de stockage dans le fichier CSV :
                      </span>
                      <div class="flex items-center gap-4 mt-1">
                        <label class="flex items-center gap-1.5 cursor-pointer font-medium">
                          <input
                            type="radio"
                            bind:group={field.wysiwygFormat}
                            value="html"
                            onchange={saveCurrent}
                            class="text-indigo-600 focus:ring-indigo-500"
                          />
                          <span>HTML sémantique (&lt;p&gt;, &lt;strong&gt;, &lt;h2&gt;)</span>
                        </label>
                        <label class="flex items-center gap-1.5 cursor-pointer font-medium">
                          <input
                            type="radio"
                            bind:group={field.wysiwygFormat}
                            value="markdown"
                            onchange={saveCurrent}
                            class="text-indigo-600 focus:ring-indigo-500"
                          />
                          <span>Markdown (##, **, -)</span>
                        </label>
                      </div>
                    </div>
                  {:else if field.type === 'select' || field.type === 'multiselect'}
                    <div class="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl text-xs space-y-2 border border-slate-200 dark:border-slate-800">
                      <div class="flex items-center justify-between">
                        <span class="font-bold text-slate-800 dark:text-slate-200">
                          {field.type === 'select' ? '🔽' : '🏷️'} Options disponibles ({field.options?.length || 0}) :
                        </span>
                        <button
                          type="button"
                          onclick={() => addOption(field)}
                          class="px-2 py-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:bg-slate-50 transition"
                        >
                          + Ajouter une option
                        </button>
                      </div>
                      <div class="flex flex-wrap gap-1.5">
                        {#each field.options || [] as opt, optIdx}
                          <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300">
                            <span>{opt}</span>
                            <button
                              type="button"
                              onclick={() => removeOption(field, optIdx)}
                              class="text-slate-400 hover:text-rose-500 font-bold ml-1"
                              title="Retirer cette option"
                            >
                              ×
                            </button>
                          </span>
                        {/each}
                      </div>
                    </div>
                  {/if}

                  <!-- Section Règles de validation et limites -->
                  <div class="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2.5">
                    <span class="block text-xs font-bold uppercase tracking-wider text-slate-400">
                      Contraintes de validation
                    </span>

                    <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs items-center">
                      <label class="flex items-center gap-2 cursor-pointer font-semibold text-slate-800 dark:text-slate-200">
                        <input
                          type="checkbox"
                          bind:checked={field.rules.required}
                          onchange={saveCurrent}
                          class="rounded text-indigo-600 focus:ring-indigo-500"
                        />
                        <span>Obligatoire</span>
                      </label>

                      <label class="flex items-center gap-2 cursor-pointer text-slate-600 dark:text-slate-400" title="Si la valeur est vide, la soumission est acceptée sans exiger min/max">
                        <input
                          type="checkbox"
                          bind:checked={field.rules.nullable}
                          onchange={saveCurrent}
                          class="rounded text-indigo-600 focus:ring-indigo-500"
                        />
                        <span>Nullable (optionnel)</span>
                      </label>

                      <div class="flex items-center gap-1.5">
                        <label for={`field-min-${field.id}`} class="text-slate-500 shrink-0 font-medium">Min :</label>
                        <input
                          id={`field-min-${field.id}`}
                          type="number"
                          bind:value={field.rules.min}
                          onblur={saveCurrent}
                          placeholder="-"
                          class="w-20 px-2 py-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono text-xs text-slate-800 dark:text-slate-200"
                        />
                      </div>

                      <div class="flex items-center gap-1.5">
                        <label for={`field-max-${field.id}`} class="text-slate-500 shrink-0 font-medium">Max :</label>
                        <input
                          id={`field-max-${field.id}`}
                          type="number"
                          bind:value={field.rules.max}
                          onblur={saveCurrent}
                          placeholder="-"
                          class="w-20 px-2 py-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono text-xs text-slate-800 dark:text-slate-200"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              {/if}
            </div>
          {/if}
        </div>
      {/each}
    </div>
  </div>

  <!-- Bouton bas de page pour enregistrer -->
  <div class="pt-2 flex justify-end gap-3">
    <button
      type="button"
      onclick={saveCurrent}
      class="px-5 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold transition"
    >
      Enregistrer le gabarit
    </button>
    <button
      type="button"
      onclick={handleSaveAndSwitch}
      class="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-xs transition"
    >
      <span>Enregistrer & Passer à la saisie</span>
      <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
      </svg>
    </button>
  </div>
</div>
