package com.agileflow.service;

import com.agileflow.dto.KanbanBoardDto;
import com.agileflow.dto.KanbanColumnDto;
import com.agileflow.dto.KanbanStatsDto;
import com.agileflow.dto.KanbanTaskDto;
import com.agileflow.dto.KanbanUpdateMessage;
import com.agileflow.dto.ProjectSummaryDto;
import com.agileflow.dto.QuickCreateTaskRequest;
import com.agileflow.dto.SprintSummaryDto;
import com.agileflow.dto.StorySummaryDto;
import com.agileflow.dto.UserSummaryDto;
import com.agileflow.entity.Project;
import com.agileflow.entity.Sprint;
import com.agileflow.entity.Task;
import com.agileflow.entity.TypeTache;
import com.agileflow.entity.User;
import com.agileflow.entity.UserStory;
import com.agileflow.exception.ForbiddenOperationException;
import com.agileflow.exception.ResourceNotFoundException;
import com.agileflow.repository.CommentRepository;
import com.agileflow.repository.ProjectMemberRepository;
import com.agileflow.repository.SprintRepository;
import com.agileflow.repository.TaskRepository;
import com.agileflow.repository.UserRepository;
import jakarta.persistence.criteria.Join;
import jakarta.persistence.criteria.JoinType;
import jakarta.persistence.criteria.Predicate;
import lombok.RequiredArgsConstructor;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.EnumMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class KanbanService {

    private static final String[] AVATAR_COLORS = {
            "#0052CC", "#00875A", "#DE350B", "#6B3DC9",
            "#FF991F", "#00B8D9", "#36B37E", "#6554C0"
    };

    private final TaskRepository taskRepository;
    private final SprintRepository sprintRepository;
    private final UserRepository userRepository;
    private final CommentRepository commentRepository;
    private final ProjectMemberRepository projectMemberRepository;
    private final ProjectAccessService projectAccessService;
    private final SimpMessagingTemplate messagingTemplate;

    @Transactional(readOnly = true)
    public KanbanBoardDto getBoard(Long projectId, Long sprintId, Long assigneeId, String search, String priorite) {
        User actor = projectAccessService.currentUser();
        Project project = projectAccessService.getProjectOrThrow(projectId);
        projectAccessService.assertProjectAccess(actor, project);

        Sprint sprint = sprintId != null ? resolveSprint(projectId, sprintId) : null;
        List<Task> tasks = taskRepository.findAll(buildSpecification(projectId, sprint != null ? sprint.getId() : null, assigneeId, search, priorite))
                .stream()
                .filter(task -> task.getTypeTache() != TypeTache.EPIC)
                .filter(task -> task.getTypeTache() != TypeTache.SUBTASK)
                .sorted(taskComparator())
                .toList();

        return new KanbanBoardDto(
                new ProjectSummaryDto(project.getId(), project.getNom(), issuePrefix(project)),
                sprint != null ? new SprintSummaryDto(sprint.getId(), sprint.getNom(), name(sprint.getStatut())) : null,
                buildColumns(tasks),
                buildStats(tasks)
        );
    }

    @Transactional
    public KanbanTaskDto quickCreate(QuickCreateTaskRequest request) {
        User actor = projectAccessService.currentUser();
        Project project = projectAccessService.getProjectOrThrow(request.projectId());
        projectAccessService.assertCanEditProjectContent(actor, project);

        Sprint sprint = request.sprintId() != null ? resolveSprint(project.getId(), request.sprintId()) : null;
        Task.Statut statut = parseEnum(request.statut(), Task.Statut.TODO, Task.Statut.class);
        Task.Priorite priorite = parseEnum(request.priorite(), Task.Priorite.MEDIUM, Task.Priorite.class);
        TypeTache typeTache = parseEnum(request.typeTache(), TypeTache.TASK, TypeTache.class);
        Task.Type legacyType = toLegacyType(typeTache);

        User assignee = null;
        if (request.assigneeId() != null) {
            assignee = userRepository.findById(request.assigneeId())
                    .orElseThrow(() -> new ResourceNotFoundException("Utilisateur assigne introuvable"));
            assertProjectMemberOrOwner(project, assignee);
        }

        Task task = Task.builder()
                .titre(request.titre().trim())
                .description(request.description())
                .statut(statut)
                .priorite(priorite)
                .type(legacyType)
                .typeTache(typeTache)
                .project(project)
                .sprint(sprint)
                .assignedTo(assignee)
                .assignedBy(assignee != null ? actor : null)
                .isUrgent(statut != Task.Statut.DONE && isWithinUrgentWindow(null))
                .labels(Set.of())
                .build();

        KanbanTaskDto dto = toKanbanTaskDto(taskRepository.save(task));
        broadcast(project.getId(), new KanbanUpdateMessage("TASK_CREATED", dto, null, dto.statut()));
        return dto;
    }

    @Transactional
    public KanbanTaskDto moveTask(Long taskId, String newStatut, Long projectId) {
        User actor = projectAccessService.currentUser();
        Task task = taskRepository.findById(taskId)
                .orElseThrow(() -> new ResourceNotFoundException("Tache introuvable"));
        Project project = resolveProject(task);
        if (project == null && projectId != null) {
            project = projectAccessService.getProjectOrThrow(projectId);
        }
        if (project == null) {
            throw new ResourceNotFoundException("Projet de la tache introuvable");
        }
        if (!projectAccessService.canEditProjectContent(actor, project)) {
            if (task.getAssignedTo() == null || !Objects.equals(task.getAssignedTo().getId(), actor.getId())) {
                throw new ForbiddenOperationException("Vous ne pouvez deplacer que les taches qui vous sont assignees");
            }
        }

        String from = name(task.getStatut());
        Task.Statut to = parseEnum(newStatut, Task.Statut.TODO, Task.Statut.class);
        task.setStatut(to);
        task.setUrgent(to != Task.Statut.DONE && isWithinUrgentWindow(task.getDateEcheance()));
        KanbanTaskDto dto = toKanbanTaskDto(taskRepository.save(task));
        broadcast(project.getId(), new KanbanUpdateMessage("TASK_MOVED", dto, from, dto.statut()));
        return dto;
    }

    public KanbanTaskDto toKanbanTaskDto(Task task) {
        UserStory story = task.getStory();
        Project project = resolveProject(task);
        int subtaskCount = task.getSousTaskes() != null ? task.getSousTaskes().size() : 0;
        int doneSubtaskCount = task.getSousTaskes() != null
                ? (int) task.getSousTaskes().stream().filter(sub -> sub.getStatut() == Task.Statut.DONE).count()
                : 0;

        return new KanbanTaskDto(
                task.getId(),
                task.getTitre(),
                task.getDescription(),
                name(task.getStatut()),
                name(task.getPriorite()),
                task.getStatut() != Task.Statut.DONE && task.isUrgent(),
                toIso(task.getDateEcheance()),
                task.getLabels() != null ? task.getLabels().stream().sorted().toList() : List.of(),
                toUserSummary(task.getAssignedTo()),
                toUserSummary(task.getAssignedBy()),
                task.getSprint() != null ? new SprintSummaryDto(task.getSprint().getId(), task.getSprint().getNom(), name(task.getSprint().getStatut())) : null,
                story != null ? new StorySummaryDto(story.getId(), story.getTitre(), name(story.getPriority())) : null,
                project != null ? new ProjectSummaryDto(project.getId(), project.getNom(), issuePrefix(project)) : null,
                commentRepository.countByTask_Id(task.getId()),
                subtaskCount,
                doneSubtaskCount,
                task.getTypeTache() != null ? task.getTypeTache().name() : TypeTache.TASK.name(),
                task.getParentTask() != null ? task.getParentTask().getId() : null,
                task.getParentTask() != null ? task.getParentTask().getTitre() : null,
                epicTitle(task),
                task.getGithubIssueNumber(),
                task.getGithubIssueUrl(),
                task.getGithubPrNumber(),
                task.getGithubPrUrl(),
                toIso(task.getDateCreation()),
                toIso(task.getDateMiseAJour()),
                updatedAgo(task.getDateMiseAJour() != null ? task.getDateMiseAJour() : task.getDateCreation())
        );
    }

    private Specification<Task> buildSpecification(Long projectId, Long sprintId, Long assigneeId, String search, String priorite) {
        return (root, query, cb) -> {
            query.distinct(true);
            List<Predicate> predicates = new ArrayList<>();
            Join<Object, Object> directProject = root.join("project", JoinType.LEFT);
            Join<Object, Object> sprint = root.join("sprint", JoinType.LEFT);
            Join<Object, Object> sprintProject = sprint.join("project", JoinType.LEFT);
            Join<Object, Object> story = root.join("story", JoinType.LEFT);
            Join<Object, Object> backlog = story.join("backlog", JoinType.LEFT);
            Join<Object, Object> backlogProject = backlog.join("project", JoinType.LEFT);

            predicates.add(cb.or(
                    cb.equal(directProject.get("id"), projectId),
                    cb.equal(sprintProject.get("id"), projectId),
                    cb.equal(backlogProject.get("id"), projectId)
            ));
            if (sprintId != null) {
                predicates.add(cb.equal(sprint.get("id"), sprintId));
            }
            if (assigneeId != null) {
                predicates.add(cb.equal(root.get("assignedTo").get("id"), assigneeId));
            }
            if (priorite != null && !priorite.isBlank()) {
                predicates.add(cb.equal(root.get("priorite"), Task.Priorite.valueOf(priorite)));
            }
            if (search != null && !search.isBlank()) {
                String like = "%" + search.toLowerCase(Locale.ROOT).trim() + "%";
                Join<Task, String> labels = root.joinSet("labels", JoinType.LEFT);
                predicates.add(cb.or(
                        cb.like(cb.lower(root.get("titre")), like),
                        cb.like(cb.lower(root.get("description")), like),
                        cb.like(cb.lower(labels), like)
                ));
            }
            return cb.and(predicates.toArray(Predicate[]::new));
        };
    }

    private String issuePrefix(Project project) {
        return project != null && project.getIssuePrefix() != null && !project.getIssuePrefix().isBlank()
                ? project.getIssuePrefix()
                : "KAN";
    }

    private List<KanbanColumnDto> buildColumns(List<Task> tasks) {
        Map<Task.Statut, List<Task>> grouped = new EnumMap<>(Task.Statut.class);
        for (Task.Statut statut : Task.Statut.values()) {
            grouped.put(statut, new ArrayList<>());
        }
        tasks.forEach(task -> grouped.get(task.getStatut() != null ? task.getStatut() : Task.Statut.TODO).add(task));
        return List.of(
                column(Task.Statut.TODO, "A FAIRE", grouped),
                column(Task.Statut.IN_PROGRESS, "EN COURS", grouped),
                column(Task.Statut.REVIEW, "REVUE EN COURS", grouped),
                column(Task.Statut.DONE, "TERMINE", grouped)
        );
    }

    private KanbanColumnDto column(Task.Statut statut, String label, Map<Task.Statut, List<Task>> grouped) {
        List<KanbanTaskDto> taskDtos = grouped.get(statut).stream().map(this::toKanbanTaskDto).toList();
        return new KanbanColumnDto(statut.name(), label, taskDtos.size(), taskDtos);
    }

    private KanbanStatsDto buildStats(List<Task> tasks) {
        LocalDateTime now = LocalDateTime.now();
        return new KanbanStatsDto(
                tasks.size(),
                tasks.stream().filter(t -> t.getStatut() == Task.Statut.TODO).count(),
                tasks.stream().filter(t -> t.getStatut() == Task.Statut.IN_PROGRESS).count(),
                tasks.stream().filter(t -> t.getStatut() == Task.Statut.REVIEW).count(),
                tasks.stream().filter(t -> t.getStatut() == Task.Statut.DONE).count(),
                tasks.stream().filter(t -> t.getStatut() != Task.Statut.DONE && t.isUrgent()).count(),
                tasks.stream().filter(t -> t.getDateEcheance() != null && t.getDateEcheance().isBefore(now) && t.getStatut() != Task.Statut.DONE).count()
        );
    }

    private Sprint resolveSprint(Long projectId, Long sprintId) {
        return sprintRepository.findById(sprintId)
                .filter(sprint -> sprint.getProject() != null && Objects.equals(sprint.getProject().getId(), projectId))
                .orElseThrow(() -> new ResourceNotFoundException("Sprint introuvable pour ce projet"));
    }

    private Comparator<Task> taskComparator() {
        return Comparator
                .comparing((Task task) -> task.getStatut() != Task.Statut.DONE && task.isUrgent()).reversed()
                .thenComparing((Task task) -> priorityRank(task.getPriorite()), Comparator.reverseOrder())
                .thenComparing(Task::getDateCreation, Comparator.nullsLast(Comparator.naturalOrder()));
    }

    private int priorityRank(Task.Priorite priorite) {
        if (priorite == null) return 0;
        return switch (priorite) {
            case LOW -> 1;
            case MEDIUM -> 2;
            case HIGH -> 3;
            case CRITICAL -> 4;
        };
    }

    private void assertProjectMemberOrOwner(Project project, User assignee) {
        boolean isOwner = project.getManager() != null && Objects.equals(project.getManager().getId(), assignee.getId());
        boolean isMember = projectMemberRepository.existsByProject_IdAndUser_Id(project.getId(), assignee.getId());
        if (!isOwner && !isMember) {
            throw new ForbiddenOperationException("Vous pouvez assigner uniquement un membre du projet");
        }
    }

    private Project resolveProject(Task task) {
        if (task.getProject() != null) return task.getProject();
        if (task.getSprint() != null) return task.getSprint().getProject();
        if (task.getStory() != null && task.getStory().getBacklog() != null) return task.getStory().getBacklog().getProject();
        return null;
    }

    private String epicTitle(Task task) {
        Task current = task.getParentTask();
        while (current != null) {
            if (current.getTypeTache() == TypeTache.EPIC) {
                return current.getTitre();
            }
            current = current.getParentTask();
        }
        return null;
    }

    private Task.Type toLegacyType(TypeTache typeTache) {
        return switch (typeTache) {
            case EPIC -> Task.Type.EPIC;
            case STORY -> Task.Type.STORY;
            case FEATURE -> Task.Type.FEATURE;
            case BUG -> Task.Type.BUG;
            default -> Task.Type.TASK;
        };
    }

    private <E extends Enum<E>> E parseEnum(String value, E fallback, Class<E> type) {
        if (value == null || value.isBlank()) return fallback;
        return Enum.valueOf(type, value.toUpperCase(Locale.ROOT));
    }

    private UserSummaryDto toUserSummary(User user) {
        if (user == null) return null;
        return new UserSummaryDto(user.getId(), user.getNom(), user.getPrenom(), user.getEmail(), initials(user), avatarColor(user.getEmail()), user.getAvatarUrl());
    }

    private String initials(User user) {
        String prenom = user.getPrenom() != null && !user.getPrenom().isBlank() ? user.getPrenom().substring(0, 1) : "";
        String nom = user.getNom() != null && !user.getNom().isBlank() ? user.getNom().substring(0, 1) : "";
        String fallback = user.getEmail() != null && !user.getEmail().isBlank() ? user.getEmail().substring(0, 1) : "?";
        return ((prenom + nom).isBlank() ? fallback : prenom + nom).toUpperCase(Locale.ROOT);
    }

    private String avatarColor(String email) {
        int hash = 0;
        String value = email != null ? email : "";
        for (char c : value.toCharArray()) {
            hash = c + ((hash << 5) - hash);
        }
        return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
    }

    private boolean isWithinUrgentWindow(LocalDateTime dateEcheance) {
        LocalDateTime now = LocalDateTime.now();
        return dateEcheance != null && dateEcheance.isAfter(now) && !dateEcheance.isAfter(now.plusHours(24));
    }

    private String updatedAgo(LocalDateTime date) {
        if (date == null) return "jamais";
        Duration duration = Duration.between(date, LocalDateTime.now());
        long minutes = Math.max(duration.toMinutes(), 0);
        if (minutes < 1) return "a l'instant";
        if (minutes < 60) return "il y a " + minutes + "min";
        long hours = minutes / 60;
        if (hours < 24) return "il y a " + hours + "h";
        long days = hours / 24;
        if (days < 30) return "il y a " + days + "j";
        return "il y a " + (days / 30) + " mois";
    }

    private void broadcast(Long projectId, KanbanUpdateMessage message) {
        messagingTemplate.convertAndSend("/topic/kanban/" + projectId, message);
    }

    private String name(Enum<?> value) {
        return value != null ? value.name() : null;
    }

    private String toIso(LocalDateTime value) {
        return value != null ? value.toString() : null;
    }
}
