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
