package com.agileflow.service;

import com.agileflow.dto.CreateProjectRequest;
import com.agileflow.dto.ProjectDTO;
import com.agileflow.dto.UpdateProjectRequest;
import com.agileflow.entity.ActivityLog;
import com.agileflow.entity.Comment;
import com.agileflow.entity.Diagram;
import com.agileflow.entity.GitHubTaskBranch;
import com.agileflow.entity.Project;
import com.agileflow.entity.Task;
import com.agileflow.entity.Team;
import com.agileflow.entity.User;
import com.agileflow.exception.BadRequestException;
import com.agileflow.exception.ResourceNotFoundException;
import com.agileflow.repository.ActivityLogRepository;
import com.agileflow.repository.BacklogRepository;
import com.agileflow.repository.ChatMessageRepository;
import com.agileflow.repository.CommentRepository;
import com.agileflow.repository.DiagramRepository;
import com.agileflow.repository.EpicRepository;
import com.agileflow.repository.GitHubIntegrationRepository;
import com.agileflow.repository.GitHubTaskBranchRepository;
import com.agileflow.repository.ProjectInvitationRepository;
import com.agileflow.repository.ProjectMemberRepository;
import com.agileflow.repository.ProjectRepository;
import com.agileflow.repository.SprintRepository;
import com.agileflow.repository.TaskRepository;
import com.agileflow.repository.TeamRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.regex.Pattern;

@Service
public class ProjectService {
    private static final Pattern ISSUE_PREFIX_PATTERN = Pattern.compile("^[A-Z0-9]{2,10}$");

    private final ProjectRepository projectRepository;
    private final SprintRepository sprintRepository;
    private final TaskRepository taskRepository;
    private final TeamRepository teamRepository;
    private final ProjectMemberRepository projectMemberRepository;
    private final ProjectInvitationRepository projectInvitationRepository;
    private final GitHubIntegrationRepository gitHubIntegrationRepository;
    private final GitHubTaskBranchRepository gitHubTaskBranchRepository;
    private final DiagramRepository diagramRepository;
    private final CommentRepository commentRepository;
    private final ChatMessageRepository chatMessageRepository;
    private final ActivityLogRepository activityLogRepository;
    private final BacklogRepository backlogRepository;
    private final EpicRepository epicRepository;
    private final ActivityLogger activityLogger;
    private final ProjectAccessService projectAccessService;

    public ProjectService(
            ProjectRepository projectRepository,
            SprintRepository sprintRepository,
            TaskRepository taskRepository,
            TeamRepository teamRepository,
            ProjectMemberRepository projectMemberRepository,
            ProjectInvitationRepository projectInvitationRepository,
            GitHubIntegrationRepository gitHubIntegrationRepository,
            GitHubTaskBranchRepository gitHubTaskBranchRepository,
            DiagramRepository diagramRepository,
            CommentRepository commentRepository,
            ChatMessageRepository chatMessageRepository,
            ActivityLogRepository activityLogRepository,
            BacklogRepository backlogRepository,
            EpicRepository epicRepository,
            ActivityLogger activityLogger,
            ProjectAccessService projectAccessService) {
        this.projectRepository = projectRepository;
        this.sprintRepository = sprintRepository;
        this.taskRepository = taskRepository;
        this.teamRepository = teamRepository;
        this.projectMemberRepository = projectMemberRepository;
        this.projectInvitationRepository = projectInvitationRepository;
        this.gitHubIntegrationRepository = gitHubIntegrationRepository;
        this.gitHubTaskBranchRepository = gitHubTaskBranchRepository;
        this.diagramRepository = diagramRepository;
        this.commentRepository = commentRepository;
        this.chatMessageRepository = chatMessageRepository;
        this.activityLogRepository = activityLogRepository;
        this.backlogRepository = backlogRepository;
        this.epicRepository = epicRepository;
        this.activityLogger = activityLogger;
        this.projectAccessService = projectAccessService;
    }

    private void validateDates(CreateProjectRequest request) {
        if (request.endDate() != null && request.endDate().isBefore(request.startDate())) {
            throw new BadRequestException("La date de fin doit etre posterieure a la date de debut.");
        }
    }

    private String normalizeIssuePrefix(String value) {
        String prefix = value == null || value.isBlank() ? "KAN" : value.trim().toUpperCase(Locale.ROOT);
        if (!ISSUE_PREFIX_PATTERN.matcher(prefix).matches()) {
            throw new BadRequestException("Le prefixe des taches doit contenir 2 a 10 lettres ou chiffres, sans espace.");
        }
        return prefix;
    }

    private String issuePrefix(Project project) {
        return project.getIssuePrefix() == null || project.getIssuePrefix().isBlank() ? "KAN" : project.getIssuePrefix();
    }

    private String normalizeImageValue(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    private void validateDates(UpdateProjectRequest request) {
        if (request.endDate() != null && request.endDate().isBefore(request.startDate())) {
            throw new BadRequestException("La date de fin doit etre posterieure a la date de debut.");
        }
    }

    private Team resolveTeam(Long teamId) {
        if (teamId == null) {
            return null;
        }
        return teamRepository.findById(teamId)
                .orElseThrow(() -> new ResourceNotFoundException("Equipe introuvable"));
    }

    ProjectDTO toProjectDTO(Project project, User actor) {
        long sprintCount = sprintRepository.findByProjectId(project.getId()).size();
        long taskCount = taskRepository.countByAnyProjectId(project.getId());
        User owner = project.getManager();
        boolean isOwner = owner != null && actor != null && owner.getId().equals(actor.getId());
        long memberCount = projectMemberRepository.countByProject_Id(project.getId());
        Team team = project.getTeam();
        return new ProjectDTO(
                project.getId(),
                project.getNom(),
                issuePrefix(project),
                project.getDescription(),
                project.getIconUrl(),
                project.getDateDebut() != null ? project.getDateDebut().toString() : null,
                project.getDateFin() != null ? project.getDateFin().toString() : null,
                project.getStatut().name(),
                owner != null ? owner.getId() : null,
                owner != null ? (owner.getPrenom() + " " + owner.getNom()).trim() : null,
                team != null ? team.getId() : null,
                team != null ? team.getName() : null,
                sprintCount,
                taskCount,
                isOwner,
                memberCount
        );
    }

    @Transactional(readOnly = true)
    public List<ProjectDTO> listProjects(String q) {
        User actor = projectAccessService.currentUser();
        String query = (q == null || q.isBlank()) ? null : q.trim().toLowerCase();

        List<Project> projects;
        if (projectAccessService.isPlatformAdmin(actor)) {
            projects = projectRepository.search(query);
        } else {
            Set<Project> accessible = new LinkedHashSet<>(projectRepository.findAccessibleByUserId(actor.getId()));
            projects = accessible.stream()
                    .filter(project -> query == null
                            || project.getNom().toLowerCase().contains(query)
                            || (project.getDescription() != null && project.getDescription().toLowerCase().contains(query)))
                    .toList();
        }

        return projects.stream().map(project -> toProjectDTO(project, actor)).toList();
    }

    @Transactional(readOnly = true)
    public ProjectDTO getProjectById(Long id) {
        Project project = projectAccessService.getProjectOrThrow(id);
        User actor = projectAccessService.currentUser();
        projectAccessService.assertProjectAccess(actor, project);
        return toProjectDTO(project, actor);
    }

    @Transactional
    public ProjectDTO createProject(CreateProjectRequest request) {
        User actor = projectAccessService.currentUser();
        validateDates(request);
        if (request.status() == Project.Statut.ARCHIVE) {
            throw new BadRequestException("Un nouveau projet ne peut pas etre cree directement en archive.");
        }

        Project project = Project.builder()
                .nom(request.name())
                .issuePrefix(normalizeIssuePrefix(request.issuePrefix()))
                .description(request.description())
                .iconUrl(normalizeImageValue(request.iconUrl()))
                .dateDebut(request.startDate())
                .dateFin(request.endDate())
                .statut(request.status())
                .manager(actor)
                .team(resolveTeam(request.teamId()))
                .build();
        projectRepository.save(project);
        activityLogger.log(actor, ActivityLog.Action.PROJECT_CREATED, "Projet cree: " + project.getNom(), project, null, null);
        return toProjectDTO(project, actor);
    }

    @Transactional
    public ProjectDTO updateProject(Long id, UpdateProjectRequest request) {
        Project project = projectAccessService.getProjectOrThrow(id);
        User actor = projectAccessService.currentUser();
        projectAccessService.assertCanManageProject(actor, project);
        validateDates(request);
        if (request.status() == Project.Statut.ARCHIVE && project.getStatut() != Project.Statut.ARCHIVE) {
            throw new BadRequestException("Utilisez l'action Archiver pour archiver un projet.");
        }
        if (project.getStatut() == Project.Statut.ARCHIVE && request.status() != Project.Statut.ARCHIVE) {
            throw new BadRequestException("Un projet archive ne peut pas etre reactive depuis ce formulaire.");
        }

        project.setNom(request.name());
        project.setIssuePrefix(normalizeIssuePrefix(request.issuePrefix()));
        project.setDescription(request.description());
        project.setIconUrl(normalizeImageValue(request.iconUrl()));
        project.setDateDebut(request.startDate());
        project.setDateFin(request.endDate());
        project.setStatut(request.status());
        project.setTeam(resolveTeam(request.teamId()));
        projectRepository.save(project);
        activityLogger.log(actor, ActivityLog.Action.PROJECT_UPDATED, "Projet mis a jour: " + project.getNom(), project, null, null);
        return toProjectDTO(project, actor);
    }

    @Transactional
    public void deleteProject(Long id) {
        Project project = projectAccessService.getProjectOrThrow(id);
        User actor = projectAccessService.currentUser();
        projectAccessService.assertCanManageProject(actor, project);

        if (project.getStatut() == Project.Statut.ARCHIVE) {
            return;
        }

        project.setStatut(Project.Statut.ARCHIVE);
        projectRepository.save(project);
        activityLogger.log(actor, ActivityLog.Action.PROJECT_UPDATED, "Projet archive: " + project.getNom(), project, null, null);
    }

    @Transactional
    public ProjectDTO restoreProject(Long id) {
        Project project = projectAccessService.getProjectOrThrow(id);
        User actor = projectAccessService.currentUser();
        if (!projectAccessService.isPlatformAdmin(actor)) {
            throw new BadRequestException("Seul l'admin plateforme peut desarchiver un projet.");
        }

        if (project.getStatut() != Project.Statut.ARCHIVE) {
            return toProjectDTO(project, actor);
        }

        project.setStatut(Project.Statut.ACTIF);
        projectRepository.save(project);
        activityLogger.log(actor, ActivityLog.Action.PROJECT_UPDATED, "Projet desarchive: " + project.getNom(), project, null, null);
        return toProjectDTO(project, actor);
    }
}
