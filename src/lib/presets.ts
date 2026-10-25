import type { FieldDefinition, PleaseTemplate } from './types';

export interface ClassicPreset {
  id: string;
  name: string;
  emoji: string;
  description: string;
  category: 'seo' | 'content' | 'taxonomy' | 'status';
  createFields: (existingKeys: string[]) => FieldDefinition[];
}

export function generateUniqueKey(baseKey: string, existingKeys: string[]): string {
  let key = baseKey;
  let counter = 1;
  while (existingKeys.includes(key)) {
    counter++;
    key = `${baseKey}_${counter}`;
  }
  return key;
}

export function generateUniqueId(): string {
  return 'f_' + Math.random().toString(36).substring(2, 9) + Date.now().toString(36).substring(4);
}

export const CLASSIC_PRESETS: ClassicPreset[] = [
  {
    id: 'title_and_slug',
    name: 'Titre & Slug URL',
    emoji: '📝',
    description: 'Un champ Titre obligatoire et son champ Slug auto-dérivé en lecture seule',
    category: 'content',
    createFields: (existingKeys) => {
      const titleKey = generateUniqueKey('title', existingKeys);
      const slugKey = generateUniqueKey('slug', [...existingKeys, titleKey]);
      return [
        {
          id: generateUniqueId(),
          key: titleKey,
          label: 'Titre',
          type: 'text',
          helpText: 'Titre principal de la page ou de l’article',
          rules: { required: true, nullable: false, min: 3, max: 120 }
        },
        {
          id: generateUniqueId(),
          key: slugKey,
          label: 'Slug URL',
          type: 'slug',
          sourceFieldKey: titleKey,
          helpText: 'Identifiant URL calculé automatiquement depuis le titre',
          rules: { required: true, nullable: false }
        }
      ];
    }
  },
  {
    id: 'seo_title',
    name: 'Titre SEO (Google)',
    emoji: '🔍',
    description: 'Champ optimisé pour les règles SERP de Google (50 à 60 caractères)',
    category: 'seo',
    createFields: (existingKeys) => [
      {
        id: generateUniqueId(),
        key: generateUniqueKey('seo_title', existingKeys),
        label: 'Titre SEO (Meta title)',
        type: 'text',
        helpText: 'Titre affiché dans les résultats Google (idéal : entre 50 et 60 caractères)',
        rules: { required: true, nullable: false, min: 50, max: 60 }
      }
    ]
  },
  {
    id: 'seo_description',
    name: 'Description SEO (Google)',
    emoji: '🔍',
    description: 'Meta description optimisée pour le SERP Google (140 à 160 caractères)',
    category: 'seo',
    createFields: (existingKeys) => [
      {
        id: generateUniqueId(),
        key: generateUniqueKey('seo_description', existingKeys),
        label: 'Description SEO (Meta description)',
        type: 'textarea',
        helpText: 'Résumé affiché sous le titre dans Google (idéal : entre 140 et 160 caractères)',
        rules: { required: true, nullable: false, min: 140, max: 160 }
      }
    ]
  },
  {
    id: 'wysiwyg_html',
    name: 'Contenu WYSIWYG (HTML)',
    emoji: '✨',
    description: 'Éditeur visuel exportant du HTML propre et sémantique',
    category: 'content',
    createFields: (existingKeys) => [
      {
        id: generateUniqueId(),
        key: generateUniqueKey('content_html', existingKeys),
        label: 'Contenu riche (HTML)',
        type: 'wysiwyg',
        wysiwygFormat: 'html',
        helpText: 'Texte mis en forme (titres, gras, listes, liens)',
        rules: { required: true, nullable: false, min: 10 }
      }
    ]
  },
  {
    id: 'wysiwyg_markdown',
    name: 'Contenu WYSIWYG (Markdown)',
    emoji: '✨',
    description: 'Éditeur visuel exportant de la syntaxe Markdown',
    category: 'content',
    createFields: (existingKeys) => [
      {
        id: generateUniqueId(),
        key: generateUniqueKey('content_md', existingKeys),
        label: 'Contenu riche (Markdown)',
        type: 'wysiwyg',
        wysiwygFormat: 'markdown',
        helpText: 'Texte formaté en Markdown avec barre d’outils et prévisualisation',
        rules: { required: true, nullable: false, min: 10 }
      }
    ]
  },
  {
    id: 'select_category',
    name: 'Catégorie (Select simple)',
    emoji: '🔽',
    description: 'Menu déroulant à choix unique',
    category: 'taxonomy',
    createFields: (existingKeys) => [
      {
        id: generateUniqueId(),
        key: generateUniqueKey('category', existingKeys),
        label: 'Catégorie',
        type: 'select',
        options: ['Actualité', 'Guide', 'Produit', 'Tutoriel'],
        helpText: 'Choisissez une catégorie parmi la liste',
        rules: { required: true, nullable: false }
      }
    ]
  },
  {
    id: 'multiselect_tags',
    name: 'Étiquettes / Tags (Select multiple)',
    emoji: '🏷️',
    description: 'Sélection multiple d’options avec limitation min/max de choix',
    category: 'taxonomy',
    createFields: (existingKeys) => [
      {
        id: generateUniqueId(),
        key: generateUniqueKey('tags', existingKeys),
        label: 'Tags / Étiquettes',
        type: 'multiselect',
        options: ['Nouveauté', 'Promotion', 'Vedette', 'Conseil', 'Tutoriel', 'SEO'],
        helpText: 'Sélectionnez entre 1 et 3 étiquettes',
        rules: { required: false, nullable: true, min: 1, max: 3 }
      }
    ]
  },
  {
    id: 'status_published',
    name: 'Statut de publication (Booléen)',
    emoji: '🔘',
    description: 'Case à cocher Oui/Non',
    category: 'status',
    createFields: (existingKeys) => [
      {
        id: generateUniqueId(),
        key: generateUniqueKey('is_published', existingKeys),
        label: 'Publié en ligne',
        type: 'boolean',
        helpText: 'Cochez si cet élément doit être publié directement',
        rules: { required: true, nullable: false }
      }
    ]
  }
];

export const DEFAULT_DEMO_TEMPLATE: PleaseTemplate = {
  schemaVersion: 1,
  id: 'tpl_demo_cms',
  name: 'Articles de Blog & Fiches CMS',
  description: 'Gabarit de démonstration avec Titre, Slug auto-dérivé, SEO Google (titre & description) et contenu riche.',
  updatedAt: new Date().toISOString(),
  fields: [
    {
      id: 'f_title',
      key: 'title',
      label: 'Titre de l’article',
      type: 'text',
      helpText: 'Titre éditorial principal',
      rules: { required: true, nullable: false, min: 5, max: 100 }
    },
    {
      id: 'f_slug',
      key: 'slug',
      label: 'Slug URL',
      type: 'slug',
      sourceFieldKey: 'title',
      helpText: 'Recalculé automatiquement depuis le titre de l’article',
      rules: { required: true, nullable: false }
    },
    {
      id: 'f_seo_title',
      key: 'seo_title',
      label: 'Titre SEO (Google SERP)',
      type: 'text',
      helpText: 'Titre optimisé pour Google (longueur idéale : 50 à 60 caractères)',
      rules: { required: true, nullable: false, min: 50, max: 60 }
    },
    {
      id: 'f_seo_desc',
      key: 'seo_description',
      label: 'Description SEO (Google SERP)',
      type: 'textarea',
      helpText: 'Meta description concise (longueur idéale : 140 à 160 caractères)',
      rules: { required: true, nullable: false, min: 140, max: 160 }
    },
    {
      id: 'f_category',
      key: 'category',
      label: 'Catégorie',
      type: 'select',
      options: ['Actualité', 'Guide', 'Interview', 'Étude de cas'],
      helpText: 'Rubrique principale de l’article',
      rules: { required: true, nullable: false }
    },
    {
      id: 'f_tags',
      key: 'tags',
      label: 'Tags / Étiquettes',
      type: 'multiselect',
      options: ['E-commerce', 'Marketing', 'SEO', 'Tech', 'Design'],
      helpText: 'Sélectionnez entre 1 et 3 étiquettes',
      rules: { required: false, nullable: true, min: 1, max: 3 }
    },
    {
      id: 'f_content',
      key: 'content',
      label: 'Corps de l’article (HTML)',
      type: 'wysiwyg',
      wysiwygFormat: 'html',
      helpText: 'Rédigez le contenu structuré avec titres et paragraphes',
      rules: { required: true, nullable: false, min: 30 }
    },
    {
      id: 'f_published',
      key: 'is_published',
      label: 'Article publié',
      type: 'boolean',
      helpText: 'Statut actif pour le CMS',
      rules: { required: true, nullable: false }
    }
  ]
};
