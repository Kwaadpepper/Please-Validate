export type FieldType =
  | 'text'
  | 'textarea'
  | 'wysiwyg'
  | 'slug'
  | 'boolean'
  | 'number'
  | 'select'
  | 'multiselect';

export type WysiwygFormat = 'html' | 'markdown';

export interface FieldTypeMeta {
  type: FieldType;
  emoji: string;
  label: string;
  shortLabel: string;
  description: string;
  category: 'text' | 'choice' | 'advanced';
}

export const FIELD_TYPE_METAS: Record<FieldType, FieldTypeMeta> = {
  text: {
    type: 'text',
    emoji: '📝',
    label: 'Texte court',
    shortLabel: 'text',
    description: 'Une ligne de texte : titre, référence, auteur...',
    category: 'text'
  },
  textarea: {
    type: 'textarea',
    emoji: '📄',
    label: 'Texte long',
    shortLabel: 'textarea',
    description: 'Paragraphe multiligne, chapeau, description...',
    category: 'text'
  },
  wysiwyg: {
    type: 'wysiwyg',
    emoji: '✨',
    label: 'Texte enrichi (WYSIWYG)',
    shortLabel: 'wysiwyg',
    description: 'Éditeur riche avec titres, gras, listes, liens...',
    category: 'text'
  },
  slug: {
    type: 'slug',
    emoji: '🔗',
    label: 'Slug URL auto-dérivé',
    shortLabel: 'slug',
    description: 'Généré automatiquement depuis un champ source',
    category: 'advanced'
  },
  boolean: {
    type: 'boolean',
    emoji: '🔘',
    label: 'Booléen (Oui/Non)',
    shortLabel: 'boolean',
    description: 'Interrupteur marche/arrêt, statut publié, actif...',
    category: 'choice'
  },
  number: {
    type: 'number',
    emoji: '🔢',
    label: 'Nombre',
    shortLabel: 'number',
    description: 'Valeur numérique : prix, ordre d’affichage, note...',
    category: 'advanced'
  },
  select: {
    type: 'select',
    emoji: '🔽',
    label: 'Menu déroulant',
    shortLabel: 'select',
    description: 'Choix unique parmi une liste d’options prédéfinies',
    category: 'choice'
  },
  multiselect: {
    type: 'multiselect',
    emoji: '🏷️',
    label: 'Choix multiple',
    shortLabel: 'multiselect',
    description: 'Sélection multiple d’étiquettes ou tags',
    category: 'choice'
  }
};

export interface FieldRules {
  required: boolean;
  nullable: boolean; // Si true et valeur vide, court-circuite min/max
  min?: number;      // Nb car. min (text/wysiwyg), valeur min (number), nb choix min (multiselect)
  max?: number;      // Nb car. max (text/wysiwyg), valeur max (number), nb choix max (multiselect)
}

export interface FieldDefinition {
  id: string;
  key: string;                   // Clé unique pour la colonne CSV (ex: "seo_title", "slug")
  label: string;                 // Libellé affiché à l'utilisateur
  type: FieldType;
  helpText?: string;             // Consigne éditoriale / texte d'aide
  rules: FieldRules;
  // Options spécifiques selon type :
  sourceFieldKey?: string;       // Clé du champ source pour le type 'slug' (ex: "title")
  wysiwygFormat?: WysiwygFormat; // 'html' ou 'markdown' pour le type 'wysiwyg'
  options?: string[];            // Liste des choix possibles pour 'select' et 'multiselect'
}

export interface PleaseTemplate {
  schemaVersion: 1;
  id: string;
  name: string;                  // Nom obligatoire du gabarit
  description?: string;
  updatedAt: string;
  fields: FieldDefinition[];
}

// Données d'une ligne de saisie
export type RowValue = string | number | boolean | string[] | null | undefined;

export interface RowData {
  _id: string;                   // Identifiant unique local pour la réactivité Svelte
  [fieldKey: string]: RowValue;
}

export interface FieldValidationError {
  fieldKey: string;
  fieldLabel: string;
  message: string;
}

export interface RowValidationSummary {
  rowId: string;
  rowIndex: number;              // 1-indexed pour l'affichage humain
  isValid: boolean;
  errors: Record<string, string>; // fieldKey -> message d'erreur
}
