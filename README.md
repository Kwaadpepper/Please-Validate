# Please Validate (`please-validate`)

> Outil web portable et autonome permettant aux équipes marketing de saisir, valider et exporter des contenus formatés pour CMS sans les pièges d'Excel.

## ✨ Caractéristiques principales

- **Compilation 100% autonome (Single-File)** : L’ensemble de l'application est compilé en un unique fichier HTML (`dist/index.html`), sans aucune dépendance externe, ni CDN. Fonctionne hors-ligne et reste autonome même après un simple `Ctrl + S`.
- **Partage par URL compressée & Fichier `.please`** :
  - Partage de gabarit instantané via le hash de l'URL (`#p=v1...` compressé en LZ-String).
  - Export et import de fichiers de configuration portable `<nom-gabarit>-v1.please`.
  - Bibliothèque locale dans le navigateur (`localStorage`) pour retrouver et basculer entre tous les gabarits utilisés.
- **Règles de validation & « Champs classiques » (Quick Presets)** :
  - **Titre + Slug URL** : Génération automatique et temps réel du slug en lecture seule (gestion des accents français, ligatures et caractères spéciaux).
  - **SEO Title (Google SERP)** : Règle min 50 / max 60 caractères, jauge de progression visuelle.
  - **SEO Description (Google SERP)** : Règle min 140 / max 160 caractères, avec **simulation visuelle du snippet Google SERP en temps réel**.
  - **Description WYSIWYG (HTML & Markdown)** : Éditeur autonome avec barre d'outils, bascule code/aperçu, et calcul des contraintes min/max sur le **texte brut visible**.
  - Types : `text`, `textarea`, `wysiwyg`, `slug`, `boolean`, `number`, `select`, `multiselect`.
  - Règles : `required`, `nullable` (court-circuite min/max si vide), `min`, `max`.
- **Gestion Multi-enregistrements & Export CSV Blindé** :
  - Vue maître/détail : liste récapitulative des entrées avec état de validation par ligne (`✓ Valide` ou `N erreurs`), filtres (`Toutes`, `En erreur`, `Valides`), et recherche textuelle.
  - Export CSV conforme **RFC 4180** avec encodage **UTF-8 et BOM** (garantie anti-corruption des accents dans Excel FR/EN).
  - Choix du séparateur (`;` ou `,`).
  - Tolérance aux exports partiels pour sauvegarder le travail en cours avec avertissement explicite.
  - Import CSV tolérant avec auto-détection du délimiteur et validation immédiate ligne par ligne.

---

## 🚀 Démarrage rapide

### Installation des dépendances
```bash
npm install
```

### Lancer le serveur de développement
```bash
npm run dev
```

### Exécuter les tests unitaires
```bash
npm run test
```

### Compiler en fichier unique autonome (dist/index.html)
```bash
npm run build
```

Le fichier `dist/index.html` généré est immédiatement diffusable par email, hébergeable sur n'importe quel serveur statique (Nginx, S3, GitHub Pages) ou ouvrable directement en double-cliquant dessus en local !

---

## 🐳 Déploiement Docker

Une image multi-stage légère basée sur Nginx Alpine est fournie :

### Avec Docker CLI
```bash
# Construire l'image
docker build -t please-validate .

# Lancer le conteneur sur le port 8080
docker run -d -p 8080:80 --name please-validate please-validate
```

### Avec Docker Compose
```bash
docker compose up -d
```

L'application est ensuite directement accessible sur [http://localhost:8080](http://localhost:8080).
