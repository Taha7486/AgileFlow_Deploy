# AgileFlow

Plateforme Agile full-stack de gestion de projets, inspiree de Jira.

AgileFlow permet de gerer des projets, membres, invitations, taches, epics,
planification en liste, tableau Kanban, chronologie Gantt, resume projet,
diagrammes collaboratifs, integration GitHub, notifications, chat et rapports
administrateur.

## Stack

### Backend

- Java 21
- Spring Boot 3.3.5
- Spring Security + JWT + OAuth2 Google/GitHub
- Spring Data JPA / Hibernate
- MySQL 8
- Spring Mail
- WebSocket STOMP over SockJS
- Maven

### Frontend

- React 18 + TypeScript
- Vite
- Material UI v5
- Zustand
- Axios avec intercepteur JWT
- React Router v6
- lucide-react
- Recharts
- dnd-kit
- React Flow / Mermaid

## Structure

```text
AgileFlow/
|-- backend/       API Spring Boot
|-- frontend/      SPA React
|-- docs/
|-- README.md
`-- CONTEXT.md
```

## Prerequis

- Java 21
- Maven
- Node.js 18+ et npm
- MySQL 8

## Configuration backend

Le backend tourne sur `http://localhost:8080`.

Fichier principal :

```text
backend/src/main/resources/application.properties
```

Configuration locale minimale :

```properties
spring.application.name=agileflow-backend
server.port=8080

spring.datasource.url=jdbc:mysql://localhost:3306/agileflow_db?createDatabaseIfNotExist=true&useSSL=false&allowPublicKeyRetrieval=true
spring.datasource.username=root
spring.datasource.password=
spring.datasource.driver-class-name=com.mysql.cj.jdbc.Driver

spring.jpa.hibernate.ddl-auto=update
spring.jpa.show-sql=true
spring.jpa.properties.hibernate.format_sql=true
spring.jpa.open-in-view=false
spring.flyway.enabled=false

jwt.secret=${JWT_SECRET:change-me-local-dev-secret}
jwt.expiration=900000
jwt.refresh-expiration=604800000

app.frontend-url=http://localhost:5173

github.api.base-url=https://api.github.com
github.webhook.base-url=${app.frontend-url}
```

Pour un usage local, `github.webhook.base-url` peut rester non public : la
connexion GitHub et la synchronisation manuelle fonctionneront, mais GitHub ne
pourra pas appeler les webhooks sur `localhost`. Pour tester les transitions
automatiques par webhook, utiliser une URL backend publique (ngrok, tunnel, ou
serveur deploye), par exemple :

```properties
github.webhook.base-url=https://votre-url-publique
```

Secrets a garder hors Git :

```env
JWT_SECRET=une_cle_longue_et_secrete
MAIL_USERNAME=votre_adresse_gmail
MAIL_PASSWORD=votre_app_password_gmail
SPRING_SECURITY_OAUTH2_CLIENT_REGISTRATION_GOOGLE_CLIENT_ID=...
SPRING_SECURITY_OAUTH2_CLIENT_REGISTRATION_GOOGLE_CLIENT_SECRET=...
SPRING_SECURITY_OAUTH2_CLIENT_REGISTRATION_GITHUB_CLIENT_ID=...
SPRING_SECURITY_OAUTH2_CLIENT_REGISTRATION_GITHUB_CLIENT_SECRET=...
```

Demarrage backend :

```powershell
cd backend
mvn spring-boot:run
```

Compilation backend :

```powershell
cd backend
mvn -DskipTests compile
```

## Configuration frontend

Le frontend tourne sur `http://localhost:5173`.

Fichier :

```text
frontend/.env
```

Contenu minimal :

```env
VITE_API_URL=http://localhost:8080/api
VITE_WS_URL=http://localhost:8080/ws
```

Demarrage frontend :

```powershell
cd frontend
npm install
npm run dev
```

Verification TypeScript sans build Vite :

```powershell
cd frontend
npm exec tsc -- --noEmit
```

Si Vite affiche une page blanche avec une erreur MUI du type
`styled_default is not a function`, nettoyer le cache Vite puis relancer :

```powershell
cd frontend
Remove-Item -Recurse -Force node_modules/.vite/deps
npm run dev
```

## Navigation actuelle

La route publique `/` affiche la landing page AgileFlow. Les boutons de la
landing redirigent vers `/login` et `/register`. Apres connexion ou inscription,
un utilisateur sans projet est renvoye vers `/` ; s'il est deja authentifie, la
landing affiche un bouton `Creer un projet` fonctionnel dans sa navbar. Le
redirect vers le resume du projet actif se fait via `/dashboard`.
Le bouton `Ouvrir AgileFlow` n'est affiche sur la landing que si l'utilisateur
connecte possede deja au moins un projet. Les CTA `Creer un projet
gratuitement`, `Commencer gratuitement` et `Connecter GitHub` ouvrent la
creation de projet quand l'utilisateur est deja connecte.

Les pages `/login`, `/register` et le loading global reprennent le visuel de la
landing : panneau sombre de marque, carte formulaire claire, OAuth Google/GitHub
et icone principale `frontend/public/agileflow-icon.png`.

Dans le header applicatif, si aucun projet n'est actif, le selecteur ne montre
plus de faux nom ni d'avatar `Projet` : il affiche directement le bouton
`Creer un projet`.

La creation de projet permet de renseigner le nom, la cle de taches, la
description, le type visuel, les dates, le statut, l'equipe, des emails a
inviter et une connexion GitHub optionnelle. Les invitations et la connexion
GitHub sont executees automatiquement apres creation du projet.

Le menu non-admin est centre sur le projet actif selectionne dans le header :

- Resume
- DiagramFlow
- Developpement
- Planification
- Kanban
- Chronologie
- Equipes

Les anciennes entrees non-admin `Tableau de bord`, `Analytics`, `Stats`,
`Backlog` et `Projets` ne sont plus affichees dans la sidebar principale.

Le selecteur de projet dans le header permet :

- choisir le projet actif ;
- creer un projet ;
- definir le prefixe des taches du projet, par exemple `KAN`, `GRF` ou `PROJ` ;
- modifier ou supprimer le projet via le menu ;
- inviter un membre via le bouton membre place a cote du projet.

## Fonctionnalites principales

### Authentification

- Login classique email/mot de passe.
- JWT access token + refresh token.
- Verification email par OTP pendant l'inscription.
- OAuth2 Google et GitHub si les variables sont configurees.
- Support des liens d'inscription avec token d'invitation projet.
- Protection contre `localStorage.user` invalide pour eviter les pages blanches.

### Projets et invitations

- Creation, modification et suppression de projet.
- La suppression d'un projet supprime aussi ses donnees liees : taches,
  commentaires, diagrammes, sprints, epics, backlog, invitations, membres,
  chat projet et integration GitHub.
- Chaque projet possede un prefixe de taches configurable (`KAN` par defaut),
  utilise dans les cartes, details, branches, PRs et commits GitHub.
- Le createur devient proprietaire (`OWNER`) du projet.
- Invitation par email depuis le header ou la page Equipe.
- Si l'utilisateur existe deja, il recoit une invitation et peut rejoindre le projet.
- Si l'utilisateur n'existe pas, il recoit un lien d'inscription avec token.
- Les invitations recues sont visibles dans le Resume projet.

### Integration GitHub

Routes API :

```text
POST   /api/github/projects/{projectId}/connect
DELETE /api/github/projects/{projectId}/disconnect
GET    /api/github/projects/{projectId}/integration
POST   /api/github/projects/{projectId}/sync
GET    /api/github/projects/{projectId}/pull-requests
GET    /api/github/projects/{projectId}/commits
GET    /api/github/projects/{projectId}/branches
GET    /api/github/projects/{projectId}/development
GET    /api/github/tasks/{taskId}/commits
GET    /api/github/tasks/{taskId}/development-panel
GET    /api/github/tasks/{taskId}/branches
GET    /api/github/tasks/{taskId}/suggest-branch-name
POST   /api/github/tasks/{taskId}/create-branch
POST   /api/github/tasks/{taskId}/create-pull-request
POST   /api/github/webhook/{projectId}
```

Fonctionnalites :

- lier un depot GitHub a un projet ;
- connecter, deconnecter et synchroniser le depot depuis la page Developpement ;
- synchroniser les issues GitHub vers les taches AgileFlow ;
- mapper les labels GitHub `epic`, `bug`, `feature` et `enhancement` vers
  `typeTache` ;
- recuperer les pull requests ouvertes et les commits recents ;
- lier une PR a une tache via les patterns `#123`, `{PREFIX}-123`,
  `task/123`, ou une branche contenant `{PREFIX}-123` ;
- traiter les webhooks `issues`, `pull_request` et `push` avec validation
  HMAC `X-Hub-Signature-256` ;
- afficher l'activite GitHub dans le Resume ;
- afficher une page Developpement dediee au projet actif avec connexion depot,
  synchronisation, PRs, branches et commits ;
- creer une branche GitHub depuis une tache ;
- creer une pull request GitHub depuis une tache ;
- afficher branches, PRs, checks et commits dans le panneau Developpement
  d'une tache ;
- afficher issues, PRs et commits dans le detail d'une tache ;
- afficher un badge PR compact sur les cartes Kanban.
- transitions automatiques : branche creee -> IN_PROGRESS, PR ouverte ->
  REVIEW, PR mergee -> DONE, PR fermee sans merge -> IN_PROGRESS, commit
  `closes/fixes/resolves #N` ou `{PREFIX}-N` -> DONE.

Securite :

- le token GitHub est stocke uniquement cote backend dans `GitHubIntegration` ;
- le token n'est jamais renvoye dans les DTOs frontend ;
- token classic recommande en local : scope `repo` pour lire/ecrire dans le
  depot, et `admin:repo_hook` uniquement si vous voulez creer le webhook GitHub ;
- `connect`, `disconnect` et `sync` sont reserves au proprietaire ou admin du
  projet ;
- l'endpoint webhook est public mais valide par signature HMAC.

### Equipe

Route : `/teams`

- Liste et grille des membres du projet actif.
- Recherche et filtres par role/statut.
- Statistiques : membres actifs, invitations en attente, taches assignees,
  taux de completion.
- Invitation de membre.
- Renvoi d'invitation.
- Modification du role projet.
- Retrait d'un membre.

### Resume projet

Route : `/projects/:projectId/summary`

Le Resume est la page d'accueil projet.

Widgets :

- message "Bonjour, ..." ;
- invitations recues ;
- KPIs projet ;
- apercu des statuts ;
- activite recente ;
- repartition par priorite ;
- types de travail ;
- charge equipe ;
- progression des epics.
- activite GitHub si un depot est connecte.

### Planification

Route : `/planning`

- Vue liste style Jira.
- Donnees filtrees par projet actif du header.
- Barre membres a cote de la recherche.
- Creation de taches : Epic, Story, Tache, Fonctionnalite, Bug.
- Creation de sous-taches.
- Edition inline et panneau de detail centre dans la zone tableau.
- Assignation limitee aux membres du projet.
- Detail GitHub d'une tache : issue liee, PR liee, commits mentionnant la tache.
- Selection multiple limitee a la suppression.
- Pas de colonne labels/actions dans la vue principale.
- Pas de logique sprint dans l'interface actuelle.

### Kanban

Route : `/kanban`

- Colonnes fixes : TODO, IN_PROGRESS, REVIEW, DONE.
- Drag and drop avec dnd-kit.
- Creation rapide de taches.
- WebSocket sur `/topic/kanban/{projectId}`.
- Les epics ne sont pas affichees comme cartes principales.
- Les sous-taches ne sont pas affichees comme cartes principales.
- Les taches rattachees a une epic affichent le contexte epic.
- Les cartes affichent un badge `PR #N` quand une pull request est liee.

### Chronologie

Route : `/timeline`

- Diagramme Gantt interactif.
- Vues : semaines, mois, trimestres.
- Les dates restent fixes pendant le scroll horizontal.
- La vue semaine et le marqueur "aujourd'hui" affichent le numero du jour.
- Les taches sans epic ne sont pas affichees.
- Les sous-taches ne sont pas affichees.
- La date d'echeance d'une epic ou tache parent est automatiquement au moins
  egale a la plus grande echeance de ses enfants.

### DiagramFlow

Route : `/diagrams`

- Liste et editeur de diagrammes.
- Collaboration temps reel.
- Types UML, sequence, use case, classe, activite, etc.
- Bibliotheque de formes, texte, connexions, lifelines et cadres.

### Analytics / Reports admin

Route : `/analytics`

- Reserve aux administrateurs plateforme.
- Activites, taches terminees, membres actifs.
- Les taches terminees sont calculees depuis `tasks.statut = DONE`.
- Les taches directes du projet sont incluses, pas uniquement les taches liees
  a un sprint.
- Export PDF.

### Notifications et chat

- Notifications in-app.
- Preferences email.
- Chat global, projet et prive.
- Presence temps reel.

## Roles

### Roles plateforme

- `ROLE_ADMIN` : admin plateforme, utilisateurs, analytics/reports, logs,
  notifications.
- `ROLE_DEVELOPER` : utilisateur applicatif standard.

### Roles projet

- `OWNER` : createur/proprietaire du projet. Peut gerer projet, membres,
  invitations et contenu.
- `ADMIN` : admin du projet. Peut gerer membres, invitations et contenu.
- `DEVELOPER` : membre contributeur. Peut creer/modifier les taches et
  diagrammes du projet.
- `VIEWER` : lecture seule.

Les assignations de taches sont limitees au proprietaire ou aux membres du
projet.

## Endpoints importants

Base API :

```text
http://localhost:8080/api
```

Groupes principaux :

```text
/api/auth
/api/projects
/api/projects/{projectId}/members
/api/projects/{projectId}/members/stats
/api/projects/{projectId}/summary
/api/github
/api/tasks
/api/tasks/planning
/api/tasks/kanban
/api/timeline
/api/diagrams
/api/chat
/api/notifications
/api/analytics
/api/stats
/api/admin
```

WebSocket :

```text
http://localhost:8080/ws
```

Topics importants :

```text
/topic/kanban/{projectId}
/topic/diagram/{diagramId}
/topic/chat/project/{projectId}
/topic/chat/private/{userId}
```

## Donnees de demo

Le profil Spring `seed` reconstruit une base de demo complete. Il supprime les
donnees existantes puis cree des utilisateurs, projets, membres, invitations,
taches, epics, sous-taches, commentaires, diagrammes, notifications, messages
chat, presence et journaux d'activite.

```powershell
cd backend/src/main/resources
./seed-data.bat
```

Compte principal pour enregistrer une demo utilisateur :

```text
owner@agileflow.com / Password@2024
```

Autres comptes utiles :

```text
admin@agileflow.com / Password@2024       admin plateforme
pm@agileflow.com / Password@2024          admin projet
frontend@agileflow.com / Password@2024    developpeur frontend
backend@agileflow.com / Password@2024     developpeur backend
viewer@agileflow.com / Password@2024      lecture seule projet
invite@agileflow.com / Password@2024      invitation projet en attente
```

Projets crees :

- `AgileFlow Demo` (`KAN`) : projet principal pour la video.
- `Mobile Banking` (`MBK`) : projet secondaire pour les filtres admin.
- `Legacy CRM` (`CRM`) : projet archive, visible cote admin.

### Storyboard video suggere

1. Landing page : hero AgileFlow, profil connecte, bouton projet.
2. Connexion avec `owner@agileflow.com`.
3. Resume projet `AgileFlow Demo` : KPIs, activite recente, notifications.
4. Planification : liste de taches, epics, sous-taches, membres, export Excel.
5. Kanban : colonnes TODO / IN_PROGRESS / REVIEW / DONE et detail d'une tache.
6. Chronologie : epics et taches planifiees dans le Gantt.
7. DiagramFlow : ouvrir `Sequence collaboration DiagramFlow`, montrer curseurs
   collaboratifs et bouton enregistrer.
8. Developpement : page GitHub du projet, branches/commits/PRs si integration
   connectee pendant la demo.
9. Equipes : roles projet, invitation en attente, presence/avatars.
10. Chat : canal projet et message prive, avatars et bouton actualiser.
11. Analytics / Reports admin : se connecter avec `admin@agileflow.com`,
    verifier KPIs, heatmap et export PDF.
12. Admin Projects : filtres, statistiques, archive/desarchive.
13. Activity Logs : journaux complets utilises par les analytics.

## Verifications rapides

Backend :

```powershell
cd backend
mvn -DskipTests compile
```

Frontend TypeScript :

```powershell
cd frontend
npm exec tsc -- --noEmit
```

Frontend dev :

```powershell
cd frontend
npm run dev
```

## Notes importantes

- Ne jamais commiter de secrets OAuth, Gmail ou JWT.
- `spring.flyway.enabled=false` en developpement ; Hibernate `ddl-auto=update`
  gere le schema.
- Les migrations SQL servent surtout de documentation locale.
- Les pages projet utilisent le projet actif du header.
- Les suppressions de taches peuvent laisser des logs historiques ;
  `ActivityLog.task` ignore les references de taches supprimees.
- En cas de page blanche, verifier d'abord la console navigateur, vider le
  cache Vite et nettoyer `localStorage` si necessaire.
