<script lang="ts">
  import { appState } from '../lib/storage.svelte';
  import { CLASSIC_PRESETS, generateUniqueId, generateUniqueKey } from '../lib/presets';
  import type { FieldDefinition, FieldType, WysiwygFormat } from '../lib/types';
  import { slugify } from '../lib/slug';

  import { exportPleaseFile } from '../lib/codec';

  // Copie de travail locale du gabarit
  let templateName = $state(appState.currentTemplate.name);
  let templateDescription = $state(appState.currentTemplate.description || '');
  let fields = $state<FieldDefinition[]>(JSON.parse(JSON.stringify(appState.currentTemplate.fields)));

  let showJsonPreview = $state(false);
  let nameError = $derived(templateName.trim() === '' ? 'Le nom du gabarit est obligatoire.' : null);

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
    // Si la clé est encore le slug par défaut ou vide, la mettre à jour depuis le label
    if (!field.key || field.key.startsWith('custom_field')) {
      const existing = fields.filter((f) => f.id !== field.id).map((f) => f.key);
      field.key = generateUniqueKey(slugify(field.label).replace(/-/g, '_'), existing) || 'field';
      saveCurrent();
    }
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

<div class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-in fade-in">
  <!-- En-tête éditeur de gabarit -->
  <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-4">
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
      <div>
        <h1 class="text-xl font-extrabold text-slate-900 dark:text-white">Configuration du gabarit</h1>
        <p class="text-xs text-slate-500 mt-0.5">
          Définissez les champs, les règles de validation et la structure de l’export CSV.
        </p>
      </div>
      <div class="flex items-center gap-2 flex-wrap">
        <button
          type="button"
          onclick={handleExportPlease}
          title="Exporter ce gabarit au format portable (.please)"
          class="px-3.5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition"
        >
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          <span>Exporter .please</span>
        </button>
        {#if appState.templatesLibrary.length > 1}
          <button
            type="button"
            onclick={handleDeleteCurrentTemplate}
            title="Supprimer ce gabarit de la liste"
            class="px-3 py-2 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-600 dark:text-rose-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition"
          >
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            <span>Supprimer</span>
          </button>
        {/if}
        <button
          type="button"
          onclick={saveCurrent}
          class="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold transition"
        >
          Enregistrer
        </button>
        <button
          type="button"
          onclick={handleSaveAndSwitch}
          class="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm transition"
        >
          <span>Aller à la saisie</span>
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
          </svg>
        </button>
      </div>
    </div>

    <!-- Métadonnées du gabarit -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <label for="template-name-input" class="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
          Nom du gabarit <span class="text-rose-500">*</span>
        </label>
        <input
          id="template-name-input"
          type="text"
          bind:value={templateName}
          onblur={saveCurrent}
          placeholder="Ex: Fiches Produits, Articles de Blog, Landing Pages..."
          class="w-full px-3.5 py-2.5 rounded-xl border text-sm bg-slate-50 dark:bg-slate-950 font-medium text-slate-900 dark:text-slate-100 transition focus:outline-none focus:ring-2 focus:ring-indigo-500
            {nameError ? 'border-rose-400 focus:ring-rose-400' : 'border-slate-300 dark:border-slate-700'}"
        />
        {#if nameError}
          <p class="text-xs text-rose-500 mt-1">{nameError}</p>
        {/if}
      </div>

      <div>
        <label for="template-desc-input" class="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
          Consigne générale / Description (optionnel)
        </label>
        <input
          id="template-desc-input"
          type="text"
          bind:value={templateDescription}
          onblur={saveCurrent}
          placeholder="Ex: Remplir tous les champs avant le passage en intégration."
          class="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-sm bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>
    </div>
  </div>

  <!-- Barre « Champs classiques » (Quick Presets) -->
  <div class="bg-gradient-to-r from-indigo-50/70 to-purple-50/70 dark:from-indigo-950/30 dark:to-purple-950/30 border border-indigo-100 dark:border-indigo-900/50 rounded-2xl p-5 space-y-3">
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-2">
        <span class="text-xs font-bold uppercase tracking-wider text-indigo-900 dark:text-indigo-300">
          ⚡ Champs classiques (Ajout en 1 clic)
        </span>
        <span class="text-[11px] text-indigo-700/80 dark:text-indigo-400">
          Modèles pré-configurés avec règles SEO et CMS
        </span>
      </div>
      <button
        type="button"
        onclick={addCustomField}
        class="px-3 py-1 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 rounded-lg text-xs font-semibold flex items-center gap-1 shadow-2xs transition"
      >
        <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
        </svg>
        <span>+ Champ personnalisé</span>
      </button>
    </div>

    <div class="flex flex-wrap gap-2">
      {#each CLASSIC_PRESETS as preset}
        <button
          type="button"
          onclick={() => addClassicPreset(preset.id)}
          title={preset.description}
          class="px-3 py-1.5 bg-white dark:bg-slate-900 hover:bg-indigo-600 hover:text-white dark:hover:bg-indigo-600 dark:hover:text-white text-slate-700 dark:text-slate-200 border border-indigo-200/80 dark:border-indigo-800/80 rounded-xl text-xs font-medium shadow-2xs transition flex items-center gap-1.5 group"
        >
          <span class="text-indigo-500 group-hover:text-white font-bold">+</span>
          <span>{preset.name}</span>
        </button>
      {/each}
    </div>
  </div>

  <!-- Liste des champs configurables -->
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <h2 class="text-base font-bold text-slate-800 dark:text-slate-200">
        Champs du gabarit ({fields.length})
      </h2>
      <button
        type="button"
        onclick={() => (showJsonPreview = !showJsonPreview)}
        class="text-xs text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 font-medium transition"
      >
        {showJsonPreview ? 'Masquer le JSON' : 'Voir le schéma JSON'}
      </button>
    </div>

    {#if showJsonPreview}
      <div class="bg-slate-900 text-slate-200 rounded-xl p-4 font-mono text-xs overflow-x-auto max-h-60 border border-slate-800">
        <pre>{JSON.stringify({ schemaVersion: 1, name: templateName, fields }, null, 2)}</pre>
      </div>
    {/if}

    <div class="space-y-4">
      {#each fields as field, index (field.id)}
        <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4 transition hover:border-slate-300 dark:hover:border-slate-700">
          <!-- Barre d'en-tête du champ -->
          <div class="flex items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div class="flex items-center gap-2 flex-wrap">
              <span class="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-xs font-bold flex items-center justify-center">
                {index + 1}
              </span>
              <span class="font-bold text-sm text-slate-900 dark:text-white">
                {field.label || 'Champ sans libellé'}
              </span>
              <span class="px-2 py-0.5 rounded text-[11px] font-mono bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-medium">
                {field.type}
              </span>
              <span class="text-xs text-slate-400 font-mono">
                col: <code class="text-indigo-600 dark:text-indigo-400 font-bold">{field.key}</code>
              </span>
            </div>

            <div class="flex items-center gap-1">
              <button
                type="button"
                disabled={index === 0}
                onclick={() => moveField(index, 'up')}
                title="Monter"
                class="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 disabled:opacity-20 transition"
              >
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7" />
                </svg>
              </button>
              <button
                type="button"
                disabled={index === fields.length - 1}
                onclick={() => moveField(index, 'down')}
                title="Descendre"
                class="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 disabled:opacity-20 transition"
              >
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              <button
                type="button"
                onclick={() => duplicateField(index)}
                title="Dupliquer"
                class="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition"
              >
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </button>
              <button
                type="button"
                onclick={() => removeField(index)}
                title="Supprimer"
                class="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 transition"
              >
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          </div>

          <!-- Configuration du champ -->
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div>
              <label for={`field-label-${field.id}`} class="block font-medium text-slate-600 dark:text-slate-400 mb-1">
                Libellé affiché
              </label>
              <input
                id={`field-label-${field.id}`}
                type="text"
                bind:value={field.label}
                onblur={() => handleLabelBlur(field)}
                class="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium"
              />
            </div>

            <div>
              <label for={`field-key-${field.id}`} class="block font-medium text-slate-600 dark:text-slate-400 mb-1">
                Clé colonne CSV
              </label>
              <input
                id={`field-key-${field.id}`}
                type="text"
                bind:value={field.key}
                onblur={saveCurrent}
                class="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label for={`field-type-${field.id}`} class="block font-medium text-slate-600 dark:text-slate-400 mb-1">
                Type de données
              </label>
              <select
                id={`field-type-${field.id}`}
                bind:value={field.type}
                onchange={saveCurrent}
                class="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value="text">Texte court (text)</option>
                <option value="textarea">Texte long (textarea)</option>
                <option value="wysiwyg">Texte enrichi (wysiwyg)</option>
                <option value="slug">Slug URL auto-dérivé (slug)</option>
                <option value="boolean">Booléen Oui/Non (boolean)</option>
                <option value="number">Nombre (number)</option>
                <option value="select">Menu déroulant (select)</option>
                <option value="multiselect">Choix multiple (multiselect)</option>
              </select>
            </div>
          </div>

          <!-- Options spécifiques au type -->
          {#if field.type === 'slug'}
            <div class="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl text-xs space-y-1.5 border border-slate-200 dark:border-slate-800">
              <label for={`field-source-${field.id}`} class="block font-medium text-slate-700 dark:text-slate-300">
                Champ source pour la génération du slug :
              </label>
              <select
                id={`field-source-${field.id}`}
                bind:value={field.sourceFieldKey}
                onchange={saveCurrent}
                class="w-full sm:w-72 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value="">-- Aucun (slug libre) --</option>
                {#each fields.filter((f) => f.id !== field.id && (f.type === 'text' || f.type === 'textarea')) as otherField}
                  <option value={otherField.key}>
                    {otherField.label} ({otherField.key})
                  </option>
                {/each}
              </select>
              <p class="text-[11px] text-slate-500">
                Le slug sera calculé automatiquement et affiché en lecture seule lors de la saisie.
              </p>
            </div>
          {:else if field.type === 'wysiwyg'}
            <div class="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl text-xs space-y-1.5 border border-slate-200 dark:border-slate-800">
              <span class="block font-medium text-slate-700 dark:text-slate-300">
                Format de stockage dans le CSV :
              </span>
              <div class="flex items-center gap-4 mt-1">
                <label class="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    bind:group={field.wysiwygFormat}
                    value="html"
                    onchange={saveCurrent}
                    class="text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>HTML sémantique (&lt;p&gt;, &lt;strong&gt;, &lt;h2&gt;)</span>
                </label>
                <label class="flex items-center gap-1.5 cursor-pointer">
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
                <span class="font-medium text-slate-700 dark:text-slate-300">
                  Options disponibles ({field.options?.length || 0}) :
                </span>
                <button
                  type="button"
                  onclick={() => addOption(field)}
                  class="px-2 py-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:bg-slate-50 transition"
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
                    >
                      ×
                    </button>
                  </span>
                {/each}
              </div>
            </div>
          {/if}

          <!-- Texte d'aide -->
          <div>
            <label for={`field-help-${field.id}`} class="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
              Consigne éditoriale / Texte d'aide
            </label>
            <input
              id={`field-help-${field.id}`}
              type="text"
              bind:value={field.helpText}
              onblur={saveCurrent}
              placeholder="Ex: Titre accrocheur destiné aux moteurs de recherche..."
              class="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <!-- Section Règles de validation -->
          <div class="pt-3 border-t border-slate-100 dark:border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs items-center">
            <label class="flex items-center gap-2 cursor-pointer font-medium text-slate-700 dark:text-slate-300">
              <input
                type="checkbox"
                bind:checked={field.rules.required}
                onchange={saveCurrent}
                class="rounded text-indigo-600 focus:ring-indigo-500"
              />
              <span>Obligatoire</span>
            </label>

            <label class="flex items-center gap-2 cursor-pointer text-slate-600 dark:text-slate-400" title="Si vide, autorise la soumission sans valider min/max">
              <input
                type="checkbox"
                bind:checked={field.rules.nullable}
                onchange={saveCurrent}
                class="rounded text-indigo-600 focus:ring-indigo-500"
              />
              <span>Nullable (optionnel)</span>
            </label>

            <div class="flex items-center gap-1.5">
              <label for={`field-min-${field.id}`} class="text-slate-500 shrink-0">Min :</label>
              <input
                id={`field-min-${field.id}`}
                type="number"
                bind:value={field.rules.min}
                onblur={saveCurrent}
                placeholder="-"
                class="w-20 px-2 py-1 rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-mono text-xs text-slate-800 dark:text-slate-200"
              />
            </div>

            <div class="flex items-center gap-1.5">
              <label for={`field-max-${field.id}`} class="text-slate-500 shrink-0">Max :</label>
              <input
                id={`field-max-${field.id}`}
                type="number"
                bind:value={field.rules.max}
                onblur={saveCurrent}
                placeholder="-"
                class="w-20 px-2 py-1 rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-mono text-xs text-slate-800 dark:text-slate-200"
              />
            </div>
          </div>
        </div>
      {/each}
    </div>
  </div>

  <div class="pt-4 flex justify-end gap-3">
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
      class="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-sm transition"
    >
      <span>Enregistrer & Passer à la saisie</span>
      <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
      </svg>
    </button>
  </div>
</div>
