# Étape 1 : Build de l'application
FROM node:22-alpine AS builder

WORKDIR /app

# Copie des fichiers de dépendances
COPY package.json package-lock.json ./
RUN npm ci

# Copie des sources et compilation
COPY . .
RUN npm run build

# Étape 2 : Image d'exécution légère avec Nginx
FROM nginx:alpine

# Copie de la configuration Nginx SPA
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copie des assets compilés
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
