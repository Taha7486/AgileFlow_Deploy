# AgileFlow

Plateforme Agile full-stack de gestion de projets, inspiree de Jira.

AgileFlow permet de gerer des projets, membres, invitations, taches, epics,
planification en liste, tableau Kanban, chronologie Gantt, resume projet,
diagrammes collaboratifs, notifications, chat et rapports administrateur.

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

Le menu non-admin est centre sur le projet actif selectionne dans le header :

- Resume
- DiagramFlow
- Planification
- Kanban
- Chronologie
- Equipes

Les anciennes entrees non-admin `Tableau de bord`, `Analytics`, `Stats`,
`Backlog` et `Projets` ne sont plus affichees dans la sidebar principale.

Le selecteur de projet dans le header permet :

- choisir le projet actif ;
- creer un projet ;
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
- Le createur devient proprietaire (`OWNER`) du projet.
- Invitation par email depuis le header ou la page Equipe.
- Si l'utilisateur existe deja, il recoit une invitation et peut rejoindre le projet.
- Si l'utilisateur n'existe pas, il recoit un lien d'inscription avec token.
- Les invitations recues sont visibles dans le Resume projet.

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

### Planification

Route : `/planning`

- Vue liste style Jira.
- Donnees filtrees par projet actif du header.
- Barre membres a cote de la recherche.
- Creation de taches : Epic, Story, Tache, Fonctionnalite, Bug.
- Creation de sous-taches.
- Edition inline et panneau de detail centre dans la zone tableau.
- Assignation limitee aux membres du projet.
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

## Donnees de test

Si le script de seed est utilise, verifier son contenu avant execution car il
peut supprimer les donnees existantes.

```powershell
cd backend/src/main/resources
./seed-data.bat
```

Comptes historiques possibles selon l'etat du seed :

```text
admin@agileflow.com / Password@2024
alice@agileflow.com / Password@2024
bob@agileflow.com / Password@2024
```

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
