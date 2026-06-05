# Guide de Déploiement AgileFlow avec Supabase

## Prérequis

- Un compte Supabase
- Un compte sur une plateforme de déploiement pour le backend (Railway, Render, Fly.io, etc.)
- Un compte sur une plateforme de déploiement pour le frontend (Vercel, Netlify, etc.)

## Étape 1 : Créer un projet Supabase

1. Allez sur [supabase.com](https://supabase.com) et créez un compte
2. Cliquez sur "New Project"
3. Remplissez les informations :
   - Name : `agileflow`
   - Database Password : Choisissez un mot de passe fort (enregistrez-le !)
   - Region : Choisissez la région la plus proche de vos utilisateurs
4. Cliquez sur "Create new project" et attendez que le projet soit prêt (quelques minutes)

## Étape 2 : Récupérer les informations de connexion Supabase

1. Dans votre projet Supabase, allez dans `Project Settings` → `Database`
2. Dans la section "Connection string", copiez la chaîne de connexion `URI` (format `postgresql://...`)
3. Remplacez `[YOUR-PASSWORD]` par le mot de passe de votre base de données que vous avez défini à l'étape 1

## Étape 3 : Déployer le Backend

### Option A : Déployer sur Railway

1. Forkez le repository AgileFlow sur GitHub
2. Allez sur [railway.app](https://railway.app) et connectez-vous avec GitHub
3. Cliquez sur "New Project" → "Deploy from repo"
4. Sélectionnez votre repository forké
5. Configurez le déploiement :
   - Root directory : `backend`
   - Build command : `mvn clean package -DskipTests`
   - Start command : `java -jar target/agileflow-backend-0.0.1-SNAPSHOT.jar`
6. Ajoutez les variables d'environnement suivantes (utilisez vos propres valeurs) :
   ```
   DATABASE_URL=postgresql://postgres:[Houssamishere706236++]@db.ixqmkmrjispuwetwjhnv.supabase.co:5432/postgres
   DB_USERNAME=postgres
   DB_PASSWORD=[Houssamishere706236++]
   JWT_SECRET=une_cle_longue_et_secrete_pour_jwt
   APP_FRONTEND_URL=https://votre-frontend.vercel.app
   SPRING_MAIL_HOST=smtp.gmail.com
   SPRING_MAIL_PORT=587
   SPRING_MAIL_USERNAME=votre-email@gmail.com
   SPRING_MAIL_PASSWORD=votre_app_password_gmail
   ```
7. Cliquez sur "Deploy"

### Option B : Déployer sur Render (avec Docker)

1. Forkez le repository sur GitHub (si ce n'est pas déjà fait)
2. Allez sur [render.com](https://render.com) et connectez-vous
3. Cliquez sur "New" → "Web Service"
4. Sélectionnez votre repository
5. Configurez :
   - Name : `agileflow-backend`
   - Region : Choisissez une région (préférez la même que Supabase)
   - Branch : `main`
   - Root Directory : `backend`
   - **Runtime : `Docker`** (important !)
6. Ajoutez les variables d'environnement suivantes :
   ```
   DATABASE_URL=jdbc:postgresql://aws-0-eu-west-1.pooler.supabase.com:5432/postgres
   DB_USERNAME=postgres.ixqmkmrjispuwetwjhnv
   DB_PASSWORD=Houssam2004++
   JWT_SECRET=changez_cette_cle_par_une_autre_longue_aleatoire
   SPRING_MAIL_HOST=smtp.gmail.com
   SPRING_MAIL_PORT=587
   SPRING_MAIL_USERNAME=achrafes283@gmail.com
   SPRING_MAIL_PASSWORD=ovls zkix dgtj lhbk
   APP_FRONTEND_URL=https://votre-frontend.vercel.app
   ```
7. Cliquez sur "Create Web Service"

## Étape 4 : Déployer le Frontend

### Option A : Déployer sur Vercel

1. Forkez le repository sur GitHub (si ce n'est pas déjà fait)
2. Allez sur [vercel.com](https://vercel.com) et connectez-vous
3. Cliquez sur "Add New" → "Project"
4. Sélectionnez votre repository
5. Configurez le déploiement :
   - Framework Preset : `Vite`
   - Root Directory : `frontend`
6. Ajoutez la variable d'environnement :
   ```
   VITE_API_URL=https://votre-backend.onrender.com/api
   VITE_WS_URL=wss://votre-backend.onrender.com/ws
   ```
7. Cliquez sur "Deploy"

### Option B : Déployer sur Netlify

1. Forkez le repository sur GitHub
2. Allez sur [netlify.com](https://netlify.com) et connectez-vous
3. Cliquez sur "Add new site" → "Import an existing project"
4. Sélectionnez GitHub et votre repository
5. Configurez :
   - Base directory : `frontend`
   - Build command : `npm run build`
   - Publish directory : `dist`
6. Ajoutez les variables d'environnement dans les paramètres du site
7. Cliquez sur "Deploy site"

## Étape 5 : Configurer les URLs de redirection OAuth2 (si utilisé)

Si vous utilisez l'authentification Google ou GitHub :

### Pour Google
1. Allez sur la [Console Google Cloud](https://console.cloud.google.com)
2. Sélectionnez votre projet
3. Allez dans "APIs & Services" → "Credentials"
4. Modifiez votre OAuth 2.0 Client ID
5. Ajoutez votre URL backend dans "Authorized redirect URIs" :
   ```
   https://votre-backend.railway.app/login/oauth2/code/google
   ```

### Pour GitHub
1. Allez sur [GitHub Settings](https://github.com/settings/developers)
2. Sélectionnez votre OAuth App
3. Modifiez le "Authorization callback URL" :
   ```
   https://votre-backend.railway.app/login/oauth2/code/github
   ```

## Étape 6 : Tester votre application

1. Ouvrez votre frontend déployé (ex: https://votre-frontend.vercel.app)
2. Créez un compte ou connectez-vous
3. Vérifiez que toutes les fonctionnalités fonctionnent correctement

## Mises à jour

Pour déployer des mises à jour :
1. Poussez vos modifications sur la branche `main` de votre repository
2. Les plateformes de déploiement (Railway, Vercel, etc.) déploieront automatiquement les modifications

## Support

Si vous rencontrez des problèmes :
- Vérifiez les logs sur votre plateforme de déploiement
- Vérifiez que toutes les variables d'environnement sont correctement configurées
- Assurez-vous que la base de données Supabase est accessible
