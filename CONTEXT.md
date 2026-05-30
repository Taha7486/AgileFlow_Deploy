# AgileFlow - Project Context

Last updated: 2026-05-29

This file describes the current project state for developers and AI assistants.
Keep it aligned with the codebase after each significant change.

## 1. Overview

AgileFlow is a full-stack Agile project management platform inspired by Jira.

The current product scope includes:

- project selector in the global header;
- project CRUD from the header selector;
- configurable project task prefix, for example `KAN`, `GRF` or `PROJ`;
- project deletion cascades through project-scoped data such as tasks,
  comments, diagrams, sprints, epics, backlog, invitations, members, project
  chat messages and GitHub integration;
- project invitations by email;
- project roles and member management;
- GitHub repository integration;
- project summary dashboard;
- planning list;
- Kanban board;
- Gantt timeline;
- collaborative diagram editor;
- chat, notifications and presence;
- admin analytics/reports and activity logs.

The UI is in French. JPA entity fields also use French names such as `nom`,
`prenom`, `titre`, `statut`, `priorite`, `dateEcheance`.

## 2. Architecture

```text
AgileFlow/
|-- backend/       Spring Boot 3.3.5 API
|-- frontend/      React 18 TypeScript SPA
|-- docs/
|-- README.md
`-- CONTEXT.md
```

Development URLs:

| Layer | URL |
|---|---|
| Backend | http://localhost:8080 |
| Frontend | http://localhost:5173 |
| API base | http://localhost:8080/api |
| WebSocket | http://localhost:8080/ws |

## 3. Tech Stack

Backend:

- Java 21
- Spring Boot 3.3.5
- Spring Security
- JWT access/refresh tokens
- OAuth2 Client for Google/GitHub
- Spring Data JPA / Hibernate
- MySQL 8
- Spring Mail
- WebSocket STOMP over SockJS
- Maven
- Lombok
- iText PDF

Frontend:

- React 18
- TypeScript
- Vite
- Material UI v5
- Zustand
- Axios
- React Router v6
- lucide-react
- Recharts
- dnd-kit
- React Flow
- Mermaid
- SockJS / STOMP

## 4. Database and Schema

Database:

```text
agileflow_db
```

Development schema management:

```properties
spring.jpa.hibernate.ddl-auto=update
spring.flyway.enabled=false
```

Important entities:

| Entity | Purpose |
|---|---|
| `User` | Platform user, global role, activation, email verification |
| `Project` | Agile project and owner |
| `ProjectMember` | Membership and project role |
| `ProjectInvitation` | Pending project invitation with token and role |
| `GitHubIntegration` | Linked GitHub repository, token, webhook id and secret |
| `Task` | Main work item with type, status, priority, parent/children |
| `TypeTache` | EPIC, STORY, TASK, FEATURE, BUG, SUBTASK |
| `Sprint` | Legacy support; hidden from current main UI |
| `UserStory` | Legacy story/backlog support and epic grouping fallback |
| `SavedView` | Saved planning filters |
| `ActivityLog` | Audit trail, tolerant of deleted task references |
| `Diagram` | Diagram metadata and persisted canvas |
| `DiagramNode` / `DiagramEdge` | Normalized diagram graph |
| `Comment` | Task comments |
| `Notification` | In-app notifications |
| `ChatMessage` | Chat messages |

Recent schema concepts:

- `projects.issue_prefix` (`KAN` by default), used for task keys such as `GRF-37`
- `tasks.type_tache`
- `tasks.parent_task_id`
- `tasks.date_debut`
- project member roles: `ADMIN`, `DEVELOPER`, `VIEWER`
- project invitation role
- `saved_views`
- `project_invitations`
- `github_integrations`
- `tasks.github_issue_number`
- `tasks.github_issue_url`
- `tasks.github_pr_number`
- `tasks.github_pr_url`

## 5. Authentication and Security

Authentication:

- JWT access token, 15 minutes.
- Refresh token, 7 days.
- Tokens stored in frontend localStorage.
- Axios interceptor attaches token and refreshes on 401.
- Email verification OTP during registration.
- Optional OAuth2 Google/GitHub.
- Registration can accept an invitation token.

Important config:

```properties
jwt.secret=${JWT_SECRET:change-me-local-dev-secret}
app.frontend-url=http://localhost:5173
github.api.base-url=https://api.github.com
github.webhook.base-url=${app.frontend-url}
```

OAuth provider secrets and Gmail credentials must be supplied through local
configuration or environment variables, not committed.

Global roles used by the current UI:

- `ROLE_ADMIN`
- `ROLE_DEVELOPER`

Project roles used inside a project:

- `OWNER`: project creator/owner. Full project permissions.
- `ADMIN`: can manage members, invitations and project content.
- `DEVELOPER`: can create and edit project content.
- `VIEWER`: read-only access.

Project-level permissions are resolved through `ProjectAccessService`.

## 6. Backend Packages

```text
com.agileflow/
|-- config/
|-- controller/
|-- dto/
|   |-- summary/
|   `-- timeline/
|-- entity/
|-- exception/
|-- repository/
|-- scheduler/
|-- security/
|-- service/
`-- websocket/
```

Important services:

| Service | Purpose |
|---|---|
| `AuthService` | Register, login, refresh, email OTP, OAuth integration |
| `ProjectService` | Project CRUD |
| `ProjectMemberService` | Members, roles, invitations, resend, accept |
| `InvitationService` | Legacy/project invitation support |
| `ProjectAccessService` | Owner/member/admin/developer/viewer permissions |
| `TaskService` | Main task CRUD, assignment, move, subtasks |
| `PlanningService` | List planning endpoint, inline edit, bulk delete, saved views |
| `KanbanService` | Kanban board and quick create |
| `TimelineService` | Gantt data, date update, epic creation |
| `ProjectSummaryService` | Project summary dashboard |
| `TaskDeadlineHierarchyService` | Parent/epic deadline >= max child deadline |
| `GitHubService` | Repository connect/disconnect, issue sync, PR/commit fetch, webhook processing |
| `DiagramService` | Diagram CRUD and real-time persistence |
| `AnalyticsService` | Admin analytics and PDF export |
| `StatsService` | Stats page metrics and exports |
| `ActivityLogService` | Audit logging |
| `EmailNotificationService` | Email notification sending |

## 7. Main Backend Endpoints

Project and members:

```text
GET    /api/projects
GET    /api/projects/{id}
POST   /api/projects
PUT    /api/projects/{id}
DELETE /api/projects/{id}

GET    /api/projects/{projectId}/members
GET    /api/projects/{projectId}/members/stats
POST   /api/projects/{projectId}/members/invite
PATCH  /api/projects/{projectId}/members/{userId}/role
DELETE /api/projects/{projectId}/members/{userId}
POST   /api/projects/{projectId}/members/{invitationId}/resend-invitation
POST   /api/projects/invitations/accept
POST   /api/projects/invitations/{invitationId}/accept
```

Project summary:

```text
GET /api/projects/{projectId}/summary
GET /api/projects/{projectId}/summary/activity
GET /api/projects/{projectId}/summary/workload
GET /api/projects/{projectId}/summary/epic-progress
```

Tasks and planning:

```text
GET    /api/tasks
POST   /api/tasks
PUT    /api/tasks/{id}
DELETE /api/tasks/{id}
PUT    /api/tasks/{id}/move
PUT    /api/tasks/{id}/assign

GET    /api/tasks/planning
PUT    /api/tasks/planning/bulk
PATCH  /api/tasks/{id}/inline
GET    /api/tasks/planning/export
```

Kanban and timeline:

```text
GET   /api/tasks/kanban/board
POST  /api/tasks/kanban/quick-create

GET   /api/timeline
PATCH /api/timeline/{taskId}/dates
POST  /api/timeline/epics
```

Other groups:

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

GET /api/diagrams
GET /api/analytics
GET /api/analytics/export.pdf
GET /api/stats
GET /api/admin/activity-logs
```

## 8. WebSocket

Endpoint:

```text
/ws
```

Important destinations:

```text
/app/kanban
/topic/kanban/{projectId}

/app/diagram/{diagramId}
/topic/diagram/{diagramId}
/topic/diagram/{diagramId}/presence

/app/chat/send
/topic/chat/project/{projectId}
/topic/chat/private/{userId}
/topic/chat/presence
```

Kanban messages support:

- `TASK_CREATED`
- `TASK_UPDATED`
- `TASK_MOVED`
- `TASK_DELETED`
- legacy `"refresh"` message

Diagram transient events like cursor movement and selection changes are not
persisted.

## 9. Frontend Structure

```text
frontend/src/
|-- api/
|-- components/
|   |-- common/
|   |-- layout/
|   `-- projects/
|-- context/
|-- hooks/
|-- pages/
|   |-- LandingPage.tsx
|   |-- LoadingPage.tsx
|   |-- DiagramFlow/
|   |-- auth/
|   |-- kanban/
|   |-- planning/
|   |-- projects/summary/
|   |-- teams/
|   `-- timeline/
|-- routes/
|-- store/
|-- types/
`-- utils/
```

Important stores:

| Store | Purpose |
|---|---|
| `authStore` | JWT, refresh token, user |
| `activeProjectStore` | Header-selected project |
| `planningStore` | Planning list data and UI state |
| `kanbanStore` | Kanban board data and DnD state |
| `timelineStore` | Gantt data and view state |
| `projectSummaryStore` | Summary dashboard state |
| `githubStore` | GitHub integration, pull requests and commits |
| `diagramStore` | Diagram editor state |

There are legacy auth store references in the codebase. Both auth stores must
read `localStorage.user` safely to avoid blank pages.

## 10. Current Frontend Routes

| Route | Purpose |
|---|---|
| `/` | Public AgileFlow landing page |
| `/login` | Branded login page with email/password and Google/GitHub OAuth |
| `/register` | Branded registration page with invitation token support and OTP verification |
| `/oauth2/redirect` | OAuth callback frontend |
| `/dashboard` | Redirect to active project summary; falls back to `/` when no project exists |
| `/projects` | Legacy/list route, no longer main sidebar entry |
| `/projects/:projectId/summary` | Project summary dashboard |
| `/development` | GitHub development view for the active project |
| `/planning` | Jira-style list planning |
| `/kanban` | Kanban board |
| `/timeline` | Chronologie/Gantt |
| `/diagrams` | Diagram list |
| `/diagrams/:id` | Diagram editor |
| `/teams` | Project team page |
| `/users` | Admin users |
| `/users/:id` | User profile |
| `/admin` | Admin dashboard |
| `/analytics` | Admin Analytics / Reports |
| `/activity-logs` | Admin activity logs |
| `/notifications` | Notification center / admin announcements |

Current non-admin sidebar:

```text
Resume
DiagramFlow
Developpement
Planification
Kanban
Chronologie
Equipes
```

Current non-admin sidebar intentionally hides:

- Tableau de bord
- Projets
- Analytics
- Stats
- Backlog

The active project header controls project-scoped pages.

## 11. Feature Notes

### Public Landing And Auth

- `/` is a public AgileFlow landing page using the main icon from
  `frontend/public/agileflow-icon.png`.
- Authenticated users without any project are redirected to `/`; the landing
  navbar then exposes a functional `Creer un projet` action.
- `Ouvrir AgileFlow` is shown on the landing only when the authenticated user
  already has at least one project.
- Landing CTAs for create project, start free and connect GitHub open the
  project creation flow for authenticated users instead of redirecting to
  registration.
- The landing demo buttons open `frontend/public/Demo_AgileFlow.mp4` in an
  overlay panel.
- `/login` and `/register` use the same branded visual language as the landing:
  dark gradient brand panel, clear form card, Google/GitHub OAuth actions and
  responsive one-column mobile layout.
- Registration keeps the existing email uniqueness checks, password policy,
  invitation token flow and OTP verification.
- `LoadingPage` is used for lazy route fallback, OAuth redirect finalization and
  active-project redirect loading.

### Global Header

- Displays AgileFlow branding.
- Displays active project selector.
- Project selector supports create/edit/archive from the dropdown/menu.
- User-facing delete actions archive projects. Archived projects disappear from
  user spaces and are blocked by project access checks; platform admins can
  archive/unarchive from Admin Projects.
- Project creation/edit includes the task prefix used for keys like `KAN-37`.
- Project creation supports invited email chips and optional GitHub repository
  connection; those actions run after the backend project is created.
- When no project is active, the header does not render a placeholder project
  avatar/name; it shows a direct create-project button.
- Member invite button is next to the project selector.
- Project-scoped pages should use `activeProjectStore`.

### Project Summary

Route:

```text
/projects/:projectId/summary
```

Data source:

```text
/api/projects/{projectId}/summary
```

Contains:

- "Bonjour, ..." greeting.
- Received project invitations.
- KPI cards.
- Status donut.
- Recent activity without the open-in-new icon.
- GitHub activity section when a repository is linked.
- Priority breakdown.
- Types of work.
- Team workload.
- Epic progress.

### Teams

Route:

```text
/teams
```

Data sources:

```text
/api/projects/{projectId}/members
/api/projects/{projectId}/members/stats
```

Capabilities:

- table/grid view;
- search;
- role/status filters;
- invite member;
- resend invitation;
- update project role;
- remove member;
- fallback stats calculation if stats endpoint fails.

### Planning

Route:

```text
/planning
```

Rules:

- uses active project from header;
- no project filter dropdown;
- no labels/actions columns;
- no sprint principle in the main UI;
- group by defaults to none/no grouping;
- group by story is removed from combo boxes;
- selected tasks only expose delete action;
- task details panel is centered inside the table area;
- assignee choices are limited to project members;
- reporter means the user who assigned/reported the task.
- task detail includes GitHub issue, PR and commits when linked.

### Kanban

Route:

```text
/kanban
```

Rules:

- epics are not rendered as cards;
- subtasks are not rendered as cards;
- tasks belonging to an epic show epic context;
- tasks linked to a pull request show a compact `PR #N` badge;
- board uses fixed statuses TODO, IN_PROGRESS, REVIEW, DONE;
- drag and drop updates status;
- header project tabs/extra toolbar were removed for a cleaner shared layout.

### Timeline

Route:

```text
/timeline
```

Rules:

- tasks without epic are hidden;
- subtasks are hidden;
- date header remains sticky/fixed during horizontal scroll;
- week view displays day numbers;
- today marker displays the day number;
- parent/epic deadline is automatically at least the max child deadline.

### Analytics / Reports

Route:

```text
/analytics
```

Admin-facing page.

Important current behavior:

- completed task metrics are calculated from `tasks` with `statut = DONE`;
- activity metrics still come from `activity_logs`;
- direct project tasks are included, not only sprint tasks.

### GitHub Integration

Backend:

- Entity: `GitHubIntegration`.
- Entity: `GitHubTaskBranch` for task-linked branches.
- Repository: `GitHubIntegrationRepository`.
- Repository: `GitHubTaskBranchRepository`.
- Service: `GitHubService`.
- Controller: `GitHubController`.
- Public webhook endpoint: `POST /api/github/webhook/{projectId}`.
- Development page endpoint: `GET /api/github/projects/{projectId}/development`.
- Task development panel endpoint: `GET /api/github/tasks/{taskId}/development-panel`.
- Branch creation endpoint: `POST /api/github/tasks/{taskId}/create-branch`.
- Pull request creation endpoint: `POST /api/github/tasks/{taskId}/create-pull-request`.
- Webhook validation: `X-Hub-Signature-256` HMAC-SHA256.
- GitHub token and webhook secret are never exposed in DTOs.
- Repository connection, disconnection and manual synchronization are managed
  from `/development`, not from the project summary.
- Task keys use the project's configurable prefix. Examples: `KAN-37`,
  `GRF-37`, `#37` and `task/37` can link GitHub activity to task id `37`.
- GitHub UTC timestamps are converted to the server local zone before relative
  display in the frontend.

Synchronization rules:

- issue label `epic` -> `TypeTache.EPIC`;
- issue label `bug` -> `TypeTache.BUG`;
- issue label `feature` or `enhancement` -> `TypeTache.FEATURE`;
- other issues -> `TypeTache.TASK`;
- GitHub issue `open` -> `Task.Statut.TODO`;
- GitHub issue `closed` -> `Task.Statut.DONE`;
- duplicate prevention uses `Task.githubIssueNumber`.

Webhook behavior:

- `issues/opened`: create or update AgileFlow task;
- `issues/closed`: set linked task to DONE;
- `issues/reopened`: set linked task to TODO;
- `create` branch events: link branch to mentioned task and move TODO tasks to IN_PROGRESS;
- `pull_request/opened`: link PR to mentioned task and move it to REVIEW;
- AgileFlow-created PRs are linked to the source task and move it to REVIEW;
- `pull_request/synchronize`: refresh the linked PR;
- `pull_request/closed` with `merged=true`: set linked task DONE and log `GITHUB_PR_MERGED`;
- `pull_request/closed` without merge: set linked task to IN_PROGRESS;
- `push`: create `GITHUB_COMMIT` activity logs for mentioned tasks;
- `push` with `closes/fixes/resolves #N`, `{PREFIX}-N` or `task/N`: set task DONE.

Frontend:

- API: `frontend/src/api/github.ts`.
- Types: `frontend/src/types/github.ts`.
- Store: `frontend/src/store/githubStore.ts`.
- Components:
  - `GitHubIntegrationPanel`;
  - `GitHubActivitySection`;
  - `GitHubTaskDetail`;
  - `GitHubDevelopmentPanel`.
- Page: `frontend/src/pages/development/DevelopmentPage.tsx`.
- `DevelopmentPage` contains the compact GitHub integration panel, a single
  manual sync action, project PRs, active branches and recent commits.
- After creating a branch or PR, `githubStore` updates the task development
  cache optimistically and refreshes the panel/project development data in the
  background.

### Activity Logs

`ActivityLog.task` uses Hibernate `@NotFound(action = IGNORE)` so logs can
survive deleted tasks.

## 12. Demo Seed

The Spring `seed` profile rebuilds a complete demo database. It deletes existing
data and creates users, projects, project roles, invitations, tasks, epics,
subtasks, comments, diagrams, notifications, chat messages, presence rows and
activity logs.

Run:

```powershell
cd backend/src/main/resources
./seed-data.bat
```

Demo accounts:

| Email | Password | Purpose |
|---|---|---|
| `owner@agileflow.com` | `Password@2024` | Main user demo, owner of `AgileFlow Demo` |
| `admin@agileflow.com` | `Password@2024` | Platform admin dashboard |
| `pm@agileflow.com` | `Password@2024` | Project admin |
| `frontend@agileflow.com` | `Password@2024` | Frontend developer |
| `backend@agileflow.com` | `Password@2024` | Backend developer |
| `viewer@agileflow.com` | `Password@2024` | Read-only project member |
| `invite@agileflow.com` | `Password@2024` | User with pending project invitation |

Seeded projects:

- `AgileFlow Demo` with issue prefix `KAN`, active and rich enough for summary,
  planning, Kanban, timeline, DiagramFlow, chat, notifications and analytics.
- `Mobile Banking` with issue prefix `MBK`, active secondary project for admin
  filters and project switching.
- `Legacy CRM` with issue prefix `CRM`, archived project visible from admin.

Recommended video/screenshots:

1. Landing page with connected profile controls.
2. Login as `owner@agileflow.com`.
3. Project summary for `AgileFlow Demo`.
4. Planning with epics, tasks, subtasks and Excel export.
5. Kanban board and task detail/comments.
6. Timeline/Gantt view.
7. DiagramFlow editor, especially `Sequence collaboration DiagramFlow`.
8. Development page and optional GitHub connection.
9. Teams page with project roles and pending invitation.
10. Chat panel with project and private messages.
11. Admin Analytics / Reports with PDF export.
12. Admin Projects with archive/unarchive.
13. Admin Activity Logs.

## 13. Development Commands

Backend:

```powershell
cd backend
mvn -DskipTests compile
mvn spring-boot:run
```

Frontend:

```powershell
cd frontend
npm install
npm run dev
npm exec tsc -- --noEmit
```

Clean Vite dependency cache:

```powershell
cd frontend
Remove-Item -Recurse -Force node_modules/.vite/deps
npm run dev
```

## 14. Environment

Backend local safe defaults:

```properties
server.port=8080
spring.datasource.url=jdbc:mysql://localhost:3306/agileflow_db?createDatabaseIfNotExist=true&useSSL=false&allowPublicKeyRetrieval=true
spring.datasource.username=root
spring.datasource.password=
spring.jpa.hibernate.ddl-auto=update
spring.flyway.enabled=false
app.frontend-url=http://localhost:5173
```

Frontend:

```env
VITE_API_URL=http://localhost:8080/api
VITE_WS_URL=http://localhost:8080/ws
```

Do not commit:

- OAuth client IDs/secrets
- Gmail app password
- real JWT secret
- local `.env`

## 15. Known Constraints and Maintenance Notes

- Flyway is disabled in development.
- Some legacy Sprint/UserStory code remains for compatibility.
- Sprint UI is hidden from current main flows unless a legacy page still uses it.
- Project-focused pages rely on the active project selector.
- Prefer `Task.typeTache` for current UI logic.
- Admin analytics and project summary should use repository methods that include
  direct project tasks, not only sprint/user-story tasks.
- If the frontend becomes blank, inspect the browser console first. Known causes:
  invalid `localStorage.user` and stale Vite optimized dependencies.
- Use `AppErrorBoundary` to display runtime errors instead of a blank screen.
