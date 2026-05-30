package com.agileflow.config;

import com.agileflow.entity.ActivityLog;
import com.agileflow.entity.Backlog;
import com.agileflow.entity.ChatMessage;
import com.agileflow.entity.ChatPresence;
import com.agileflow.entity.Comment;
import com.agileflow.entity.Diagram;
import com.agileflow.entity.DiagramCollaborator;
import com.agileflow.entity.DiagramEdge;
import com.agileflow.entity.DiagramNode;
import com.agileflow.entity.Notification;
import com.agileflow.entity.Project;
import com.agileflow.entity.ProjectInvitation;
import com.agileflow.entity.ProjectMember;
import com.agileflow.entity.Sprint;
import com.agileflow.entity.Task;
import com.agileflow.entity.Team;
import com.agileflow.entity.TeamMember;
import com.agileflow.entity.TypeTache;
import com.agileflow.entity.User;
import com.agileflow.entity.UserStory;
import com.agileflow.repository.ActivityLogRepository;
import com.agileflow.repository.BacklogRepository;
import com.agileflow.repository.ChatContactInvitationRepository;
import com.agileflow.repository.ChatMessageRepository;
import com.agileflow.repository.ChatPresenceRepository;
import com.agileflow.repository.CommentMentionRepository;
import com.agileflow.repository.CommentRepository;
import com.agileflow.repository.DiagramCollaboratorRepository;
import com.agileflow.repository.DiagramEdgeRepository;
import com.agileflow.repository.DiagramNodeRepository;
import com.agileflow.repository.DiagramRepository;
import com.agileflow.repository.GitHubIntegrationRepository;
import com.agileflow.repository.GitHubTaskBranchRepository;
import com.agileflow.repository.NotificationRepository;
import com.agileflow.repository.ProjectInvitationRepository;
import com.agileflow.repository.ProjectMemberRepository;
import com.agileflow.repository.ProjectRepository;
import com.agileflow.repository.SavedViewRepository;
import com.agileflow.repository.SprintRepository;
import com.agileflow.repository.TaskRepository;
import com.agileflow.repository.TeamMemberRepository;
import com.agileflow.repository.TeamRepository;
import com.agileflow.repository.UserRepository;
import com.agileflow.repository.UserStoryRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Set;

@Component
@RequiredArgsConstructor
@Slf4j
@Profile("seed")
public class DataInitializer implements CommandLineRunner {

    private static final String PASSWORD = "Password@2024";

    private final UserRepository userRepository;
    private final TeamRepository teamRepository;
    private final TeamMemberRepository teamMemberRepository;
    private final ProjectRepository projectRepository;
    private final ProjectMemberRepository projectMemberRepository;
    private final ProjectInvitationRepository projectInvitationRepository;
    private final BacklogRepository backlogRepository;
    private final UserStoryRepository userStoryRepository;
    private final SprintRepository sprintRepository;
    private final TaskRepository taskRepository;
    private final CommentRepository commentRepository;
    private final CommentMentionRepository commentMentionRepository;
    private final ActivityLogRepository activityLogRepository;
    private final DiagramRepository diagramRepository;
    private final DiagramNodeRepository diagramNodeRepository;
    private final DiagramEdgeRepository diagramEdgeRepository;
    private final DiagramCollaboratorRepository diagramCollaboratorRepository;
    private final NotificationRepository notificationRepository;
    private final ChatMessageRepository chatMessageRepository;
    private final ChatPresenceRepository chatPresenceRepository;
    private final ChatContactInvitationRepository chatContactInvitationRepository;
    private final GitHubIntegrationRepository gitHubIntegrationRepository;
    private final GitHubTaskBranchRepository gitHubTaskBranchRepository;
    private final SavedViewRepository savedViewRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    @Transactional
    public void run(String... args) {
        log.info("Reset demo seed data...");
        clearData();

        LocalDate today = LocalDate.now();
        LocalDateTime now = LocalDateTime.now();

        User platformAdmin = user("admin@agileflow.com", "Karim", "Admin", User.Role.ROLE_ADMIN,
                avatar("K", "#DC2626"), now.minusMonths(5), now.minusHours(1));
        User owner = user("owner@agileflow.com", "Amina", "Owner", User.Role.ROLE_DEVELOPER,
                avatar("AO", "#2563EB"), now.minusMonths(4), now.minusMinutes(25));
        User projectAdmin = user("pm@agileflow.com", "Yassine", "PM", User.Role.ROLE_DEVELOPER,
                avatar("YP", "#7C3AED"), now.minusMonths(4), now.minusMinutes(45));
        User devFrontend = user("frontend@agileflow.com", "Sara", "Frontend", User.Role.ROLE_DEVELOPER,
                avatar("SF", "#16A34A"), now.minusMonths(3), now.minusMinutes(10));
        User devBackend = user("backend@agileflow.com", "Mehdi", "Backend", User.Role.ROLE_DEVELOPER,
                avatar("MB", "#0EA5E9"), now.minusMonths(3), now.minusHours(2));
        User viewer = user("viewer@agileflow.com", "Nora", "Viewer", User.Role.ROLE_DEVELOPER,
                avatar("NV", "#64748B"), now.minusMonths(2), now.minusDays(1));
        User invited = user("invite@agileflow.com", "Imane", "Invitee", User.Role.ROLE_DEVELOPER,
                avatar("II", "#F59E0B"), now.minusWeeks(3), null);
        userRepository.saveAll(List.of(platformAdmin, owner, projectAdmin, devFrontend, devBackend, viewer, invited));

        Team coreTeam = Team.builder()
                .name("Equipe Produit AgileFlow")
                .description("Equipe de demonstration: produit, frontend, backend et lecture seule.")
                .manager(owner)
                .createdAt(now.minusMonths(3))
                .build();
        teamRepository.save(coreTeam);
        teamMemberRepository.saveAll(List.of(
                member(coreTeam, projectAdmin, now.minusMonths(3)),
                member(coreTeam, devFrontend, now.minusMonths(3).plusDays(2)),
                member(coreTeam, devBackend, now.minusMonths(3).plusDays(3)),
                member(coreTeam, viewer, now.minusMonths(2))
        ));

        Project agileFlow = project(
                "AgileFlow Demo",
                "Plateforme SaaS Agile avec Kanban, planification, timeline, DiagramFlow, chat et analytics.",
                "KAN",
                Project.Statut.ACTIF,
                owner,
                coreTeam,
                today.minusDays(35),
                today.plusDays(90),
                avatar("AF", "#2563EB")
        );
        Project mobile = project(
                "Mobile Banking",
                "Projet secondaire pour montrer les filtres admin et les projets multiples.",
                "MBK",
                Project.Statut.ACTIF,
                projectAdmin,
                coreTeam,
                today.minusDays(18),
                today.plusDays(45),
                avatar("MB", "#16A34A")
        );
        Project archived = project(
                "Legacy CRM",
                "Projet archive visible uniquement cote administration.",
                "CRM",
                Project.Statut.ARCHIVE,
                owner,
                coreTeam,
                today.minusMonths(8),
                today.minusMonths(2),
                avatar("LC", "#94A3B8")
        );
        projectRepository.saveAll(List.of(agileFlow, mobile, archived));

        projectMemberRepository.saveAll(List.of(
                projectMember(agileFlow, projectAdmin, ProjectMember.ProjectRole.ADMIN, now.minusMonths(3)),
                projectMember(agileFlow, devFrontend, ProjectMember.ProjectRole.DEVELOPER, now.minusMonths(3).plusDays(1)),
                projectMember(agileFlow, devBackend, ProjectMember.ProjectRole.DEVELOPER, now.minusMonths(3).plusDays(2)),
                projectMember(agileFlow, viewer, ProjectMember.ProjectRole.VIEWER, now.minusMonths(2)),
                projectMember(mobile, owner, ProjectMember.ProjectRole.ADMIN, now.minusDays(18)),
                projectMember(mobile, devFrontend, ProjectMember.ProjectRole.DEVELOPER, now.minusDays(16)),
                projectMember(mobile, viewer, ProjectMember.ProjectRole.VIEWER, now.minusDays(10))
        ));

        projectInvitationRepository.save(ProjectInvitation.builder()
                .project(agileFlow)
                .invitedBy(owner)
                .email(invited.getEmail())
                .invitedUser(invited)
                .token("demo-invitation-token-agileflow")
                .role(ProjectMember.ProjectRole.DEVELOPER)
                .status(ProjectInvitation.InvitationStatus.PENDING)
                .createdAt(now.minusDays(2))
                .expiresAt(now.plusDays(12))
                .build());

        Backlog backlog = Backlog.builder().project(agileFlow).build();
        Backlog mobileBacklog = Backlog.builder().project(mobile).build();
        backlogRepository.saveAll(List.of(backlog, mobileBacklog));
        agileFlow.setBacklog(backlog);
        mobile.setBacklog(mobileBacklog);

        Sprint sprint = Sprint.builder()
                .nom("Sprint 4 - Collaboration temps reel")
                .description("Finalisation des flux demo: GitHub, DiagramFlow, Kanban et analytics.")
                .dateDebut(today.minusDays(7))
                .dateFin(today.plusDays(7))
                .statut(Sprint.Statut.ACTIF)
                .project(agileFlow)
                .capacitePoints(42)
                .build();
        Sprint nextSprint = Sprint.builder()
                .nom("Sprint 5 - Reporting avance")
                .description("Amelioration des exports et rapports administrateur.")
                .dateDebut(today.plusDays(8))
                .dateFin(today.plusDays(22))
                .statut(Sprint.Statut.PLANIFIE)
                .project(agileFlow)
                .capacitePoints(34)
                .build();
        sprintRepository.saveAll(List.of(sprint, nextSprint));

        UserStory authStory = story("Authentification et onboarding", "Connexion, inscription et creation projet.", UserStory.Priority.CRITICAL, 8, backlog, sprint, now.minusDays(30));
        UserStory planningStory = story("Planification Jira-style", "Liste, edition inline, sous-taches et export Excel.", UserStory.Priority.HIGH, 13, backlog, sprint, now.minusDays(25));
        UserStory collabStory = story("Collaboration temps reel", "Chat, presence, DiagramFlow et notifications.", UserStory.Priority.HIGH, 8, backlog, sprint, now.minusDays(20));
        UserStory analyticsStory = story("Analytics et rapports", "Dashboard admin et PDF avec donnees fiables.", UserStory.Priority.MEDIUM, 5, backlog, nextSprint, now.minusDays(12));
        userStoryRepository.saveAll(List.of(authStory, planningStory, collabStory, analyticsStory));

        Task epicAuth = epic("Onboarding complet", "Permettre a une equipe de demarrer depuis la landing page.", agileFlow, owner, today.minusDays(30).atStartOfDay(), today.plusDays(8).atStartOfDay(), Task.Statut.IN_PROGRESS);
        Task epicDelivery = epic("Pilotage de livraison", "Centraliser planning, Kanban, timeline et reporting.", agileFlow, projectAdmin, today.minusDays(20).atStartOfDay(), today.plusDays(30).atStartOfDay(), Task.Statut.IN_PROGRESS);
        Task epicCollab = epic("Collaboration projet", "Diagrammes, chat, presence et notifications.", agileFlow, devFrontend, today.minusDays(15).atStartOfDay(), today.plusDays(20).atStartOfDay(), Task.Statut.REVIEW);
        taskRepository.saveAll(List.of(epicAuth, epicDelivery, epicCollab));

        Task t1 = task("Finaliser la page landing", "Hero, CTA, profil connecte et formulaire projet.", TypeTache.FEATURE, Task.Statut.DONE, Task.Priorite.HIGH, agileFlow, sprint, authStory, epicAuth, devFrontend, owner, today.minusDays(24).atStartOfDay(), today.minusDays(2).atStartOfDay(), Set.of("frontend", "landing"));
        Task t2 = task("Creation de projet avec cle configurable", "L'utilisateur choisit KAN, GRF ou toute autre cle.", TypeTache.STORY, Task.Statut.DONE, Task.Priorite.CRITICAL, agileFlow, sprint, authStory, epicAuth, devBackend, owner, today.minusDays(22).atStartOfDay(), today.minusDays(1).atStartOfDay(), Set.of("backend", "projets"));
        Task t3 = task("Completer le detail Kanban", "Ajouter commentaires, GitHub, assignation, dates et actions.", TypeTache.TASK, Task.Statut.IN_PROGRESS, Task.Priorite.HIGH, agileFlow, sprint, planningStory, epicDelivery, devFrontend, projectAdmin, today.minusDays(10).atStartOfDay(), today.plusDays(3).atStartOfDay(), Set.of("kanban", "ux"));
        Task t4 = task("Exporter la planification en Excel", "Fichier stylise avec logo, filtres et colonnes ajustees.", TypeTache.FEATURE, Task.Statut.REVIEW, Task.Priorite.MEDIUM, agileFlow, sprint, planningStory, epicDelivery, devBackend, projectAdmin, today.minusDays(6).atStartOfDay(), today.plusDays(2).atStartOfDay(), Set.of("export", "excel"));
        Task t5 = task("Corriger presence dans le chat", "Stabiliser l'affichage en ligne et les avatars.", TypeTache.BUG, Task.Statut.TODO, Task.Priorite.CRITICAL, agileFlow, sprint, collabStory, epicCollab, devBackend, projectAdmin, today.minusDays(4).atStartOfDay(), today.plusDays(1).atStartOfDay(), Set.of("chat", "presence"));
        Task t6 = task("Curseurs collaboratifs DiagramFlow", "Afficher qui deplace une forme en temps reel.", TypeTache.BUG, Task.Statut.REVIEW, Task.Priorite.HIGH, agileFlow, sprint, collabStory, epicCollab, devFrontend, projectAdmin, today.minusDays(3).atStartOfDay(), today.plusDays(1).atStartOfDay(), Set.of("diagramflow", "websocket"));
        Task t7 = task("Rapport Analytics PDF", "Compter toutes les activites comme Activity Logs.", TypeTache.TASK, Task.Statut.DONE, Task.Priorite.MEDIUM, agileFlow, nextSprint, analyticsStory, epicDelivery, devBackend, owner, today.minusDays(8).atStartOfDay(), today.atStartOfDay(), Set.of("analytics", "pdf"));
        Task t8 = task("Ecran projets admin", "Lister, archiver et desarchiver les projets.", TypeTache.FEATURE, Task.Statut.IN_PROGRESS, Task.Priorite.MEDIUM, agileFlow, nextSprint, analyticsStory, epicDelivery, projectAdmin, owner, today.minusDays(5).atStartOfDay(), today.plusDays(9).atStartOfDay(), Set.of("admin", "projects"));
        Task sub1 = subtask("Verifier responsive mobile", t1, devFrontend, Task.Statut.DONE, today.minusDays(1).atStartOfDay());
        Task sub2 = subtask("Ajouter tests de suppression logique", t8, devBackend, Task.Statut.TODO, today.plusDays(5).atStartOfDay());
        taskRepository.saveAll(List.of(t1, t2, t3, t4, t5, t6, t7, t8, sub1, sub2));

        Task m1 = task("Prototype login mobile", "Flux d'authentification pour l'application mobile.", TypeTache.STORY, Task.Statut.IN_PROGRESS, Task.Priorite.HIGH, mobile, null, null, null, devFrontend, projectAdmin, today.minusDays(12).atStartOfDay(), today.plusDays(10).atStartOfDay(), Set.of("mobile", "auth"));
        Task m2 = task("API solde compte", "Endpoint securise pour afficher les comptes.", TypeTache.TASK, Task.Statut.TODO, Task.Priorite.MEDIUM, mobile, null, null, null, devBackend, projectAdmin, today.minusDays(8).atStartOfDay(), today.plusDays(14).atStartOfDay(), Set.of("api", "banking"));
        taskRepository.saveAll(List.of(m1, m2));

        commentRepository.saveAll(List.of(
                comment(t3, projectAdmin, "Priorite demo: montrer le panneau Kanban puis enregistrer les modifications.", now.minusDays(2)),
                comment(t4, devBackend, "Export Excel pret pour revue, logo et filtres inclus.", now.minusHours(8)),
                comment(t6, devFrontend, "Le curseur reste visible pendant le drag des formes.", now.minusHours(3)),
                comment(t5, owner, "A traiter avant l'enregistrement video de la partie chat.", now.minusHours(2))
        ));

        seedDiagrams(agileFlow, owner, devFrontend, devBackend, t6, now);
        seedNotifications(owner, projectAdmin, devFrontend, devBackend, viewer, agileFlow, t3, t5, t6, now);
        seedChat(owner, projectAdmin, devFrontend, devBackend, viewer, agileFlow, now);
        seedActivity(owner, projectAdmin, devFrontend, devBackend, viewer, agileFlow, mobile, sprint, t1, t2, t3, t4, t5, t6, t7, t8);

        log.info("Demo seed data ready. Main account: owner@agileflow.com / {}", PASSWORD);
    }

    private void clearData() {
        commentMentionRepository.deleteAll();
        commentRepository.deleteAll();
        chatContactInvitationRepository.deleteAll();
        chatMessageRepository.deleteAll();
        chatPresenceRepository.deleteAll();
        diagramCollaboratorRepository.deleteAll();
        diagramEdgeRepository.deleteAll();
        diagramNodeRepository.deleteAll();
        diagramRepository.deleteAll();
        gitHubTaskBranchRepository.deleteAll();
        gitHubIntegrationRepository.deleteAll();
        activityLogRepository.deleteAll();
        notificationRepository.deleteAll();
        projectInvitationRepository.deleteAll();
        taskRepository.deleteAll();
        userStoryRepository.deleteAll();
        sprintRepository.deleteAll();
        backlogRepository.deleteAll();
        projectMemberRepository.deleteAll();
        projectRepository.deleteAll();
        teamMemberRepository.deleteAll();
        teamRepository.deleteAll();
        savedViewRepository.deleteAll();
        userRepository.deleteAll();
    }

    private User user(String email, String firstName, String lastName, User.Role role, String avatar, LocalDateTime createdAt, LocalDateTime lastLogin) {
        return User.builder()
                .prenom(firstName)
                .nom(lastName)
                .email(email)
                .password(passwordEncoder.encode(PASSWORD))
                .role(role)
                .actif(true)
                .emailVerified(true)
                .avatarUrl(avatar)
                .dateCreation(createdAt)
                .dateDerniereConnexion(lastLogin)
                .build();
    }

    private TeamMember member(Team team, User user, LocalDateTime joinedAt) {
        return TeamMember.builder().team(team).user(user).joinedAt(joinedAt).build();
    }

    private Project project(String name, String description, String prefix, Project.Statut status, User manager, Team team, LocalDate start, LocalDate end, String icon) {
        return Project.builder()
                .nom(name)
                .description(description)
                .issuePrefix(prefix)
                .statut(status)
                .manager(manager)
                .team(team)
                .dateDebut(start)
                .dateFin(end)
                .iconUrl(icon)
                .build();
    }

    private ProjectMember projectMember(Project project, User user, ProjectMember.ProjectRole role, LocalDateTime joinedAt) {
        return ProjectMember.builder().project(project).user(user).role(role).joinedAt(joinedAt).build();
    }

    private UserStory story(String title, String description, UserStory.Priority priority, int points, Backlog backlog, Sprint sprint, LocalDateTime createdAt) {
        return UserStory.builder()
                .titre(title)
                .description(description)
                .priority(priority)
                .storyPoints(points)
                .backlog(backlog)
                .sprint(sprint)
                .createdAt(createdAt)
                .build();
    }

    private Task epic(String title, String description, Project project, User assignee, LocalDateTime start, LocalDateTime due, Task.Statut status) {
        return Task.builder()
                .titre(title)
                .description(description)
                .type(Task.Type.EPIC)
                .typeTache(TypeTache.EPIC)
                .statut(status)
                .priorite(Task.Priorite.HIGH)
                .project(project)
                .assignedTo(assignee)
                .assignedBy(project.getManager())
                .dateDebut(start)
                .dateEcheance(due)
                .labels(Set.of("epic"))
                .build();
    }

    private Task task(String title, String description, TypeTache type, Task.Statut status, Task.Priorite priority, Project project, Sprint sprint, UserStory story, Task parent, User assignee, User reporter, LocalDateTime start, LocalDateTime due, Set<String> labels) {
        return Task.builder()
                .titre(title)
                .description(description)
                .type(toLegacyType(type))
                .typeTache(type)
                .statut(status)
                .priorite(priority)
                .project(project)
                .sprint(sprint)
                .story(story)
                .parentTask(parent)
                .assignedTo(assignee)
                .assignedBy(reporter)
                .dateDebut(start)
                .dateEcheance(due)
                .githubPrNumber(status == Task.Statut.REVIEW ? 24 : null)
                .githubPrUrl(status == Task.Statut.REVIEW ? "https://github.com/agileflow/demo/pull/24" : null)
                .labels(labels)
                .build();
    }

    private Task subtask(String title, Task parent, User assignee, Task.Statut status, LocalDateTime due) {
        return Task.builder()
                .titre(title)
                .description("Sous-tache de demo rattachee a " + parent.getTitre())
                .type(Task.Type.TASK)
                .typeTache(TypeTache.SUBTASK)
                .statut(status)
                .priorite(Task.Priorite.MEDIUM)
                .project(parent.getProject())
                .sprint(parent.getSprint())
                .story(parent.getStory())
                .parentTask(parent)
                .assignedTo(assignee)
                .assignedBy(parent.getAssignedBy())
                .dateDebut(LocalDateTime.now().minusDays(2))
                .dateEcheance(due)
                .labels(Set.of("subtask"))
                .build();
    }

    private Task.Type toLegacyType(TypeTache type) {
        return switch (type) {
            case EPIC -> Task.Type.EPIC;
            case STORY -> Task.Type.STORY;
            case FEATURE -> Task.Type.FEATURE;
            case BUG -> Task.Type.BUG;
            default -> Task.Type.TASK;
        };
    }

    private Comment comment(Task task, User author, String content, LocalDateTime createdAt) {
        return Comment.builder().task(task).auteur(author).contenu(content).createdAt(createdAt).build();
    }

    private void seedDiagrams(Project project, User owner, User frontend, User backend, Task task, LocalDateTime now) {
        Diagram flow = diagram("Onboarding utilisateur", "Parcours inscription -> projet -> invitation.", Diagram.Type.FLOWCHART, project, owner, task, now.minusDays(4));
        Diagram sequence = diagram("Sequence collaboration DiagramFlow", "Evenements WebSocket entre deux editeurs.", Diagram.Type.SEQUENCE, project, frontend, task, now.minusDays(2));
        diagramRepository.saveAll(List.of(flow, sequence));

        diagramCollaboratorRepository.saveAll(List.of(
                DiagramCollaborator.builder().diagram(flow).user(frontend).permission(DiagramCollaborator.Permission.EDIT).addedAt(now.minusDays(4)).build(),
                DiagramCollaborator.builder().diagram(flow).user(backend).permission(DiagramCollaborator.Permission.COMMENT).addedAt(now.minusDays(3)).build(),
                DiagramCollaborator.builder().diagram(sequence).user(owner).permission(DiagramCollaborator.Permission.EDIT).addedAt(now.minusDays(2)).build()
        ));

        diagramNodeRepository.saveAll(List.of(
                node("flow-start", flow, "diagramNode", 80, 120, 170, 70, "{\"shape\":\"terminator\",\"label\":\"Visiteur\"}", 1),
                node("flow-project", flow, "diagramNode", 310, 120, 210, 80, "{\"shape\":\"process\",\"label\":\"Creation projet\"}", 2),
                node("flow-team", flow, "diagramNode", 580, 120, 210, 80, "{\"shape\":\"process\",\"label\":\"Invitation equipe\"}", 3),
                node("seq-user", sequence, "diagramNode", 120, 80, 180, 90, "{\"shape\":\"lifeline\",\"label\":\"Editeur A\"}", 1),
                node("seq-ws", sequence, "diagramNode", 420, 80, 190, 90, "{\"shape\":\"lifeline\",\"label\":\"WebSocket\"}", 2),
                node("seq-user-b", sequence, "diagramNode", 720, 80, 180, 90, "{\"shape\":\"lifeline\",\"label\":\"Editeur B\"}", 3)
        ));
        diagramEdgeRepository.saveAll(List.of(
                edge("flow-e1", flow, "flow-start", "flow-project", "{\"label\":\"commence\"}"),
                edge("flow-e2", flow, "flow-project", "flow-team", "{\"label\":\"invite\"}"),
                edge("seq-e1", sequence, "seq-user", "seq-ws", "{\"label\":\"CURSOR_MOVE\"}"),
                edge("seq-e2", sequence, "seq-ws", "seq-user-b", "{\"label\":\"CONTENT_UPDATE\"}")
        ));
    }

    private Diagram diagram(String title, String description, Diagram.Type type, Project project, User owner, Task task, LocalDateTime createdAt) {
        String canvas = "{\"nodes\":[],\"edges\":[]}";
        return Diagram.builder()
                .title(title)
                .titre(title)
                .description(description)
                .type(type)
                .project(project)
                .owner(owner)
                .createdBy(owner)
                .task(task)
                .etapesJson("[\"Analyse\",\"Edition\",\"Validation\"]")
                .json(canvas)
                .canvasData(canvas)
                .shared(true)
                .isShared(true)
                .createdAt(createdAt)
                .updatedAt(createdAt.plusHours(6))
                .build();
    }

    private DiagramNode node(String id, Diagram diagram, String type, double x, double y, double width, double height, String data, int zIndex) {
        return DiagramNode.builder().id(id).diagram(diagram).type(type).positionX(x).positionY(y).width(width).height(height).data(data).zIndex(zIndex).locked(false).build();
    }

    private DiagramEdge edge(String id, Diagram diagram, String source, String target, String data) {
        return DiagramEdge.builder().id(id).diagram(diagram).sourceNodeId(source).targetNodeId(target).edgeType("association").arrowStart("none").arrowEnd("filled").data(data).build();
    }

    private void seedNotifications(User owner, User projectAdmin, User frontend, User backend, User viewer, Project project, Task kanban, Task bug, Task diagram, LocalDateTime now) {
        notificationRepository.saveAll(List.of(
                notification(owner, "Nouvelle invitation en attente pour " + project.getNom(), "/teams", false, now.minusDays(2)),
                notification(projectAdmin, "La tache " + kanban.getTitre() + " est en cours.", "/kanban", false, now.minusHours(20)),
                notification(frontend, "PR ouverte pour " + diagram.getTitre(), "/development", false, now.minusHours(8)),
                notification(backend, "Bug critique assigne: " + bug.getTitre(), "/planning", false, now.minusHours(2)),
                notification(viewer, "Le rapport analytics est disponible.", "/analytics", true, now.minusDays(1))
        ));
    }

    private Notification notification(User user, String message, String targetUrl, boolean read, LocalDateTime date) {
        return Notification.builder().user(user).message(message).targetUrl(targetUrl).lu(read).dateCreation(date).build();
    }

    private void seedChat(User owner, User projectAdmin, User frontend, User backend, User viewer, Project project, LocalDateTime now) {
        chatPresenceRepository.saveAll(List.of(
                presence(owner, true, ChatPresence.VisibilityStatus.LIVE, now.minusMinutes(1)),
                presence(projectAdmin, true, ChatPresence.VisibilityStatus.BUSY, now.minusMinutes(4)),
                presence(frontend, true, ChatPresence.VisibilityStatus.LIVE, now.minusMinutes(2)),
                presence(backend, false, ChatPresence.VisibilityStatus.ABSENT, now.minusHours(1)),
                presence(viewer, false, ChatPresence.VisibilityStatus.ABSENT, now.minusDays(1))
        ));
        chatMessageRepository.saveAll(List.of(
                chat(owner, ChatMessage.ChannelType.PROJECT, project, null, "Bonjour equipe, objectif demo: montrer un flux projet complet.", now.minusHours(6)),
                chat(projectAdmin, ChatMessage.ChannelType.PROJECT, project, null, "Je prepare Kanban et Timeline pour la capture video.", now.minusHours(5)),
                chat(frontend, ChatMessage.ChannelType.PROJECT, project, null, "DiagramFlow est pret avec les curseurs collaboratifs.", now.minusHours(3)),
                chat(backend, ChatMessage.ChannelType.PRIVATE, null, owner, "J'ai corrige les exports PDF et Excel.", now.minusHours(2)),
                chat(owner, ChatMessage.ChannelType.PRIVATE, null, backend, "Parfait, je valide dans la video.", now.minusMinutes(90))
        ));
    }

    private ChatPresence presence(User user, boolean online, ChatPresence.VisibilityStatus status, LocalDateTime lastSeen) {
        return ChatPresence.builder().user(user).isOnline(online).status(status).lastSeen(lastSeen).build();
    }

    private ChatMessage chat(User sender, ChatMessage.ChannelType type, Project project, User recipient, String content, LocalDateTime createdAt) {
        return ChatMessage.builder().sender(sender).channelType(type).project(project).recipient(recipient).content(content).createdAt(createdAt).build();
    }

    private void seedActivity(User owner, User projectAdmin, User frontend, User backend, User viewer, Project project, Project mobile, Sprint sprint, Task... tasks) {
        LocalDateTime now = LocalDateTime.now();
        activityLogRepository.saveAll(List.of(
                log(owner, project, sprint, null, ActivityLog.Action.PROJECT_CREATED, "Projet cree: " + project.getNom(), now.minusDays(28)),
                log(owner, project, sprint, tasks[0], ActivityLog.Action.TASK_CREATED, "Tache creee: " + tasks[0].getTitre(), now.minusDays(24)),
                log(frontend, project, sprint, tasks[0], ActivityLog.Action.TASK_COMPLETED, "Tache terminee: " + tasks[0].getTitre(), now.minusDays(2)),
                log(backend, project, sprint, tasks[1], ActivityLog.Action.TASK_COMPLETED, "Tache terminee: " + tasks[1].getTitre(), now.minusDays(1)),
                log(projectAdmin, project, sprint, tasks[2], ActivityLog.Action.TASK_MOVED, "Tache deplacee en cours: " + tasks[2].getTitre(), now.minusHours(20)),
                log(backend, project, sprint, tasks[3], ActivityLog.Action.GITHUB_PR_OPENED, "PR ouverte pour " + tasks[3].getTitre(), now.minusHours(9)),
                log(frontend, project, sprint, tasks[5], ActivityLog.Action.GITHUB_COMMIT, "Commit: fix cursor during node drag", now.minusHours(4)),
                log(owner, project, sprint, tasks[6], ActivityLog.Action.TASK_COMPLETED, "Rapport analytics valide.", now.minusHours(3)),
                log(projectAdmin, project, sprint, tasks[7], ActivityLog.Action.PROJECT_UPDATED, "Projet admin archive/desarchive teste.", now.minusHours(2)),
                log(viewer, project, sprint, null, ActivityLog.Action.STORY_PLANNED, "Consultation du resume projet.", now.minusHours(1)),
                log(projectAdmin, mobile, null, null, ActivityLog.Action.PROJECT_CREATED, "Projet cree: " + mobile.getNom(), now.minusDays(16))
        ));
    }

    private ActivityLog log(User actor, Project project, Sprint sprint, Task task, ActivityLog.Action action, String message, LocalDateTime createdAt) {
        return ActivityLog.builder()
                .actor(actor)
                .project(project)
                .sprint(sprint)
                .task(task)
                .action(action)
                .message(message)
                .activityDate(createdAt.toLocalDate())
                .createdAt(createdAt)
                .build();
    }

    private String avatar(String initials, String color) {
        String label = initials.length() > 2 ? initials.substring(0, 2) : initials;
        return "https://ui-avatars.com/api/?name=" + label + "&background=" + color.replace("#", "") + "&color=fff&bold=true";
    }
}
