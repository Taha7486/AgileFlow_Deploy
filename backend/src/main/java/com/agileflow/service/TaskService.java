package com.agileflow.service;

import com.agileflow.dto.*;
import com.agileflow.entity.*;
import com.agileflow.exception.BadRequestException;
import com.agileflow.exception.ForbiddenOperationException;
import com.agileflow.exception.ResourceNotFoundException;
import com.agileflow.repository.ProjectRepository;
import com.agileflow.repository.ProjectMemberRepository;
import com.agileflow.repository.ActivityLogRepository;
import com.agileflow.repository.CommentMentionRepository;
import com.agileflow.repository.CommentRepository;
import com.agileflow.repository.DiagramRepository;
import com.agileflow.repository.GitHubTaskBranchRepository;
import com.agileflow.repository.SprintRepository;
import com.agileflow.repository.TaskRepository;
import com.agileflow.repository.UserRepository;
import com.agileflow.repository.UserStoryRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.HashSet;
import java.util.List;
import java.util.Objects;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class TaskService {

    private static final DateTimeFormatter DATE_TIME_FORMAT = DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm");

    private final TaskRepository taskRepository;
    private final UserRepository userRepository;
    private final ProjectMemberRepository projectMemberRepository;
    private final SprintRepository sprintRepository;
    private final ProjectRepository projectRepository;
    private final UserStoryRepository userStoryRepository;
    private final ActivityLogger activityLogger;
    private final ActivityLogRepository activityLogRepository;
    private final CommentMentionRepository commentMentionRepository;
    private final CommentRepository commentRepository;
    private final DiagramRepository diagramRepository;
    private final GitHubTaskBranchRepository gitHubTaskBranchRepository;
    private final EmailNotificationService emailNotificationService;
    private final ProjectAccessService projectAccessService;
    private final SimpMessagingTemplate messagingTemplate;
    private final PlanningService planningService;
    private final TaskDeadlineHierarchyService taskDeadlineHierarchyService;

    private User currentUser() {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("Utilisateur courant introuvable"));
    }

    private boolean isAdmin(User user) {
        return user.getRole() == User.Role.ROLE_ADMIN;
    }

    private boolean canViewProject(User actor, Project project) {
        return projectAccessService.hasProjectAccess(actor, project);
    }

    private boolean canManageProject(User actor, Project project) {
        return projectAccessService.canEditProjectContent(actor, project);
    }

    private Task getTaskOrThrow(Long taskId) {
        return taskRepository.findById(taskId)
                .orElseThrow(() -> new ResourceNotFoundException("Tâche introuvable"));
    }

    private TaskDTO toDto(Task task) {
        boolean isUrgent = task.getStatut() != Task.Statut.DONE && task.isUrgent();
        return new TaskDTO(
                task.getId(),
                task.getTitre(),
                task.getDescription(),
                task.getType() != null ? task.getType().name() : Task.Type.TASK.name(),
                task.getStatut() != null ? task.getStatut().name() : null,
                task.getPriorite() != null ? task.getPriorite().name() : null,
                isUrgent,
                task.getAssignedTo() != null ? task.getAssignedTo().getId() : null,
                task.getAssignedTo() != null ? task.getAssignedTo().getPrenom() + " " + task.getAssignedTo().getNom() : null,
                task.getSprint() != null ? task.getSprint().getId() : null,
                task.getSprint() != null ? "Sprint " + task.getSprint().getNumero() : null,
                task.getStory() != null ? task.getStory().getId() : null,
                formatDeadline(task.getDateEcheance()),
                task.getLabels() != null ? new HashSet<>(task.getLabels()) : new HashSet<>()
        );
    }

    private Project resolveProject(Task task) {
        if (task.getProject() != null) {
            return task.getProject();
        }
        if (task.getSprint() != null) {
            return task.getSprint().getProject();
        }
        if (task.getStory() != null && task.getStory().getBacklog() != null) {
            return task.getStory().getBacklog().getProject();
        }
        return null;
    }

    @Transactional(readOnly = true)
    public List<TaskDTO> getTasksBySprint(Long sprintId) {
        User actor = currentUser();
        Sprint sprint = sprintRepository.findById(sprintId)
                .orElseThrow(() -> new ResourceNotFoundException("Sprint introuvable"));
        if (!canViewProject(actor, sprint.getProject())) {
            throw new ForbiddenOperationException("Vous n'avez pas accès à ce projet");
        }
        return taskRepository.findBySprintId(sprintId).stream().map(this::toDto).toList();
    }

    @Transactional(readOnly = true)
    public List<TaskDTO> getTasksByProject(Long projectId) {
        User actor = currentUser();
        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new ResourceNotFoundException("Projet introuvable"));
        if (!canViewProject(actor, project)) {
            throw new ForbiddenOperationException("Vous n'avez pas accès à ce projet");
        }
        return taskRepository.findByAnyProjectId(projectId).stream().map(this::toDto).toList();
    }

    @Transactional
    public TaskDTO createTask(CreateTaskRequest request) {
        User actor = currentUser();
        
        // New tasks belong directly to a project. Sprint is kept only for legacy data.
        Project project = null;
        Sprint sprint = null;
        UserStory story = null;
        
        if (request.projectId() != null) {
            project = projectRepository.findById(request.projectId())
                    .orElseThrow(() -> new ResourceNotFoundException("Projet introuvable"));
        }

        if (request.sprintId() != null) {
            sprint = sprintRepository.findById(request.sprintId())
                    .orElseThrow(() -> new ResourceNotFoundException("Sprint introuvable"));
            project = sprint.getProject();
        } else if (request.storyId() != null) {
            story = userStoryRepository.findById(request.storyId())
                    .orElseThrow(() -> new ResourceNotFoundException("User story introuvable"));
            project = story.getBacklog().getProject();
        }
        
        if (project == null) {
            throw new IllegalArgumentException("Un projectId est requis pour creer une tache");
        }

        if (!canManageProject(actor, project)) {
            throw new ForbiddenOperationException("Vous ne pouvez pas créer de tâche pour ce projet");
        }

        User assignedTo = null;
        if (request.assignedToId() != null) {
            assignedTo = userRepository.findById(request.assignedToId())
                    .orElseThrow(() -> new ResourceNotFoundException("Utilisateur assigné introuvable"));
            assertProjectMemberOrOwner(project, assignedTo);
        }

        LocalDateTime dateEcheance = null;
        if (request.dateEcheance() != null && !request.dateEcheance().isEmpty()) {
            dateEcheance = parseDeadline(request.dateEcheance());
        }

        Task task = Task.builder()
                .titre(request.titre())
                .description(request.description())
                .type(request.type() != null ? request.type() : Task.Type.TASK)
                .typeTache(syncTypeTache(request.type() != null ? request.type() : Task.Type.TASK))
                .statut(Task.Statut.TODO)
                .priorite(request.priorite() != null ? request.priorite() : Task.Priorite.MEDIUM)
                .project(project)
                .sprint(sprint)
                .story(story)
                .assignedTo(assignedTo)
                .assignedBy(assignedTo != null ? actor : null)
                .dateEcheance(dateEcheance)
                .isUrgent(isWithinUrgentWindow(dateEcheance))
                .deadline24hReminderSent(false)
                .deadline1hReminderSent(false)
                .labels(request.labels() != null ? request.labels() : new HashSet<>())
                .build();

        Task saved = taskRepository.save(task);
        activityLogger.log(actor, ActivityLog.Action.TASK_CREATED, "Tache creee: " + saved.getTitre(), project, sprint, saved);
        emailNotificationService.sendTaskAssigned(saved);
        return toDto(saved);
    }

    @Transactional
    public TaskDTO updateTask(Long taskId, UpdateTaskRequest request) {
        User actor = currentUser();
        Task task = getTaskOrThrow(taskId);
        Project project = resolveProject(task);
        Long previousAssignedToId = task.getAssignedTo() != null ? task.getAssignedTo().getId() : null;
        LocalDateTime previousDeadline = task.getDateEcheance();

        if (project != null && !canManageProject(actor, project)) {
            throw new ForbiddenOperationException("Vous ne pouvez pas modifier cette tâche");
        }

        task.setTitre(request.titre());
        task.setDescription(request.description());
        if (request.type() != null) {
            task.setType(request.type());
            task.setTypeTache(syncTypeTache(request.type()));
        }
        if (request.priorite() != null) {
            task.setPriorite(request.priorite());
        }

        if (request.assignedToId() != null) {
            User assignedTo = userRepository.findById(request.assignedToId())
                    .orElseThrow(() -> new ResourceNotFoundException("Utilisateur assigné introuvable"));
            assertProjectMemberOrOwner(project, assignedTo);
            task.setAssignedTo(assignedTo);
            if (!Objects.equals(previousAssignedToId, assignedTo.getId())) {
                task.setAssignedBy(actor);
            }
        } else {
            task.setAssignedTo(null);
            task.setAssignedBy(null);
        }

        if (request.dateEcheance() != null && !request.dateEcheance().isEmpty()) {
            task.setDateEcheance(parseDeadline(request.dateEcheance()));
        } else {
            task.setDateEcheance(null);
        }
        if (!sameDeadline(previousDeadline, task.getDateEcheance())) {
            task.setDeadline24hReminderSent(false);
            task.setDeadline1hReminderSent(false);
        }
        task.setUrgent(task.getStatut() != Task.Statut.DONE && isWithinUrgentWindow(task.getDateEcheance()));
        taskDeadlineHierarchyService.normalizeDeadlineHierarchy(task);
        
        if (request.labels() != null) {
            task.setLabels(new HashSet<>(request.labels()));
        } else {
            task.setLabels(new HashSet<>());
        }

        Task saved = taskRepository.save(task);
        activityLogger.log(actor, ActivityLog.Action.TASK_UPDATED, "Tache mise a jour: " + saved.getTitre(), project, saved.getSprint(), saved);
        Long newAssignedToId = saved.getAssignedTo() != null ? saved.getAssignedTo().getId() : null;
        if (newAssignedToId != null && !newAssignedToId.equals(previousAssignedToId)) {
            emailNotificationService.sendTaskAssigned(saved);
        }
        return toDto(saved);
    }

    @Transactional
    public void deleteTask(Long taskId) {
        User actor = currentUser();
        Task task = getTaskOrThrow(taskId);
        Project project = resolveProject(task);

        if (project != null && !canManageProject(actor, project)) {
            throw new ForbiddenOperationException("Vous ne pouvez pas supprimer cette tâche");
        }

        activityLogger.log(actor, ActivityLog.Action.TASK_DELETED, "Tache supprimee: " + task.getTitre(), project, task.getSprint(), null);
        cleanupTaskDependencies(task);
        taskRepository.delete(task);
    }

    private void cleanupTaskDependencies(Task task) {
        List<Long> taskIds = collectTaskIds(task);
        if (taskIds.isEmpty()) {
            return;
        }
        diagramRepository.detachTasks(taskIds);
        commentMentionRepository.deleteByCommentTaskIds(taskIds);
        commentRepository.deleteByTask_IdIn(taskIds);
        gitHubTaskBranchRepository.deleteByTask_IdIn(taskIds);
        activityLogRepository.deleteByTask_IdIn(taskIds);
    }

    private List<Long> collectTaskIds(Task task) {
        List<Long> ids = new java.util.ArrayList<>();
        collectTaskIds(task, ids);
        return ids;
    }

    private void collectTaskIds(Task task, List<Long> ids) {
        if (task == null || task.getId() == null || ids.contains(task.getId())) {
            return;
        }
        ids.add(task.getId());
        taskRepository.findByParentTask_Id(task.getId()).forEach(child -> collectTaskIds(child, ids));
    }

    @Transactional
    public TaskDTO moveTask(Long taskId, MoveTaskRequest request) {
        User actor = currentUser();
        Task task = getTaskOrThrow(taskId);
        Project project = resolveProject(task);

        // Note: Future improvement: Allow DEVELOPER to move any task in a project they can view, 
        // or restrict strictly to tasks assigned to them.
        // Currently: ADMIN/MANAGER can move any task in their project. 
        // DEVELOPER can only move tasks assigned to them.
        if (project != null) {
            if (!canManageProject(actor, project)) {
                if (actor.getRole() == User.Role.ROLE_DEVELOPER) {
                    if (task.getAssignedTo() == null || !task.getAssignedTo().getId().equals(actor.getId())) {
                        throw new ForbiddenOperationException("Vous ne pouvez déplacer que les tâches qui vous sont assignées");
                    }
                } else {
                    throw new ForbiddenOperationException("Vous n'avez pas les droits pour déplacer cette tâche");
                }
            }
        }

        // Validation pour les EPICs
        if (request.statut() == Task.Statut.DONE && task.getTypeTache() == TypeTache.EPIC) {
            boolean allDone = task.getSousTaskes().stream()
                    .allMatch(st -> st.getStatut() == Task.Statut.DONE);
            if (!allDone) {
                throw new BadRequestException("Toutes les sous-tâches de l'EPIC doivent être terminées avant de pouvoir la clôturer.");
            }
        }

        task.setStatut(request.statut());
        if (request.statut() == Task.Statut.DONE) {
            task.setDeadline24hReminderSent(true);
            task.setDeadline1hReminderSent(true);
        }
        task.setUrgent(request.statut() != Task.Statut.DONE && isWithinUrgentWindow(task.getDateEcheance()));
        Task saved = taskRepository.save(task);
        ActivityLog.Action action = request.statut() == Task.Statut.DONE
                ? ActivityLog.Action.TASK_COMPLETED
                : ActivityLog.Action.TASK_MOVED;
        activityLogger.log(actor, action, "Tache deplacee: " + saved.getTitre(), project, saved.getSprint(), saved);
        return toDto(saved);
    }

    @Transactional
    public PlanningTaskDto createSubtask(Long parentId, CreateSubtaskRequest request) {
        User actor = currentUser();
        Task parent = getTaskOrThrow(parentId);
        Project project = resolveProject(parent);

        if (project != null && !canManageProject(actor, project)) {
            throw new ForbiddenOperationException("Vous ne pouvez pas créer de sous-tâche pour ce projet");
        }

        TypeTache typeTache;
        if (parent.getTypeTache() == TypeTache.EPIC) {
            typeTache = request.typeTache();
            if (typeTache == null || typeTache == TypeTache.EPIC || typeTache == TypeTache.SUBTASK) {
                typeTache = TypeTache.TASK;
            }
        } else {
            typeTache = TypeTache.SUBTASK;
        }
        Task.Type legacyType = switch (typeTache) {
            case EPIC -> Task.Type.EPIC;
            case STORY -> Task.Type.STORY;
            case FEATURE -> Task.Type.FEATURE;
            case BUG -> Task.Type.BUG;
            default -> Task.Type.TASK;
        };

        User assignedTo = null;
        if (request.assigneeId() != null) {
            assignedTo = userRepository.findById(request.assigneeId())
                    .orElseThrow(() -> new ResourceNotFoundException("Utilisateur assigné introuvable"));
            assertProjectMemberOrOwner(project, assignedTo);
        }

        Task subtask = Task.builder()
                .titre(request.titre())
                .description(request.description())
                .type(legacyType)
                .typeTache(typeTache)
                .statut(Task.Statut.TODO)
                .priorite(request.priorite() != null ? Task.Priorite.valueOf(request.priorite()) : Task.Priorite.MEDIUM)
                .parentTask(parent)
                .project(project)
                .sprint(parent.getSprint())
                .story(parent.getStory())
                .assignedTo(assignedTo)
                .assignedBy(assignedTo != null ? actor : null)
                .build();

        Task saved = taskRepository.save(subtask);
        activityLogger.log(actor, ActivityLog.Action.TASK_CREATED, "Sous-tâche créée: " + saved.getTitre(), project, saved.getSprint(), saved);
        
        if (assignedTo != null) {
            emailNotificationService.sendTaskAssigned(saved);
        }

        if (project != null) {
            messagingTemplate.convertAndSend("/topic/kanban/" + project.getId(), "refresh");
        }

        return planningService.toPlanningTaskDto(saved);
    }

    @Transactional(readOnly = true)
    public List<PlanningTaskDto> getSubtasks(Long taskId) {
        Task task = getTaskOrThrow(taskId);
        return task.getSousTaskes().stream()
                .map(planningService::toPlanningTaskDto)
                .toList();
    }

    @Transactional
    public void detachSubtask(Long taskId, Long subtaskId) {
        User actor = currentUser();
        Task parent = getTaskOrThrow(taskId);
        Task subtask = getTaskOrThrow(subtaskId);
        
        if (!parent.getId().equals(subtask.getParentTask() != null ? subtask.getParentTask().getId() : null)) {
            throw new BadRequestException("Cette tâche n'est pas une sous-tâche du parent spécifié");
        }

        Project project = resolveProject(parent);
        if (project != null && !canManageProject(actor, project)) {
            throw new ForbiddenOperationException("Vous ne pouvez pas détacher cette tâche");
        }

        subtask.setParentTask(null);
        taskRepository.save(subtask);
    }

    @Transactional
    public TaskDTO assignTask(Long taskId, AssignTaskRequest request) {
        User actor = currentUser();
        Task task = getTaskOrThrow(taskId);
        Project project = resolveProject(task);

        if (project != null && !canManageProject(actor, project)) {
            throw new ForbiddenOperationException("Vous ne pouvez pas assigner cette tâche");
        }

        User assignedTo = userRepository.findById(request.assignedToId())
                .orElseThrow(() -> new ResourceNotFoundException("Utilisateur assigné introuvable"));
        assertProjectMemberOrOwner(project, assignedTo);
        
        task.setAssignedTo(assignedTo);
        task.setAssignedBy(actor);
        Task saved = taskRepository.save(task);
        activityLogger.log(actor, ActivityLog.Action.TASK_ASSIGNED, "Tache assignee: " + saved.getTitre(), project, saved.getSprint(), saved);
        emailNotificationService.sendTaskAssigned(saved);
        return toDto(saved);
    }

    private void assertProjectMemberOrOwner(Project project, User assignee) {
        if (project == null || assignee == null) {
            return;
        }
        Long assigneeId = assignee.getId();
        boolean isOwner = project.getManager() != null && Objects.equals(project.getManager().getId(), assigneeId);
        boolean isMember = projectMemberRepository.existsByProject_IdAndUser_Id(project.getId(), assigneeId);
        if (!isOwner && !isMember) {
            throw new ForbiddenOperationException("Vous pouvez assigner uniquement un membre du projet");
        }
    }

    private LocalDateTime parseDeadline(String value) {
        try {
            return LocalDateTime.parse(value);
        } catch (DateTimeParseException ignored) {
            return LocalDate.parse(value).atStartOfDay();
        }
    }

    private String formatDeadline(LocalDateTime dateEcheance) {
        return dateEcheance != null ? dateEcheance.format(DATE_TIME_FORMAT) : null;
    }

    private boolean sameDeadline(LocalDateTime previousDeadline, LocalDateTime newDeadline) {
        return previousDeadline == null ? newDeadline == null : previousDeadline.equals(newDeadline);
    }

    private boolean isWithinUrgentWindow(LocalDateTime dateEcheance) {
        LocalDateTime now = LocalDateTime.now();
        return dateEcheance != null && dateEcheance.isAfter(now) && !dateEcheance.isAfter(now.plusHours(24));
    }

    private TypeTache syncTypeTache(Task.Type type) {
        if (type == null) return TypeTache.TASK;
        return switch (type) {
            case EPIC -> TypeTache.EPIC;
            case STORY -> TypeTache.STORY;
            case FEATURE -> TypeTache.FEATURE;
            case BUG -> TypeTache.BUG;
            default -> TypeTache.TASK;
        };
    }
}
