package com.agileflow.service;

import com.agileflow.dto.BulkActionRequest;
import com.agileflow.dto.BulkActionResponse;
import com.agileflow.dto.InlineEditRequest;
import com.agileflow.dto.PlanningGroupDto;
import com.agileflow.dto.PlanningPageResponse;
import com.agileflow.dto.PlanningStatsDto;
import com.agileflow.dto.PlanningTaskDto;
import com.agileflow.dto.ProjectSummaryDto;
import com.agileflow.dto.SavedViewDto;
import com.agileflow.dto.SavedViewRequest;
import com.agileflow.dto.SprintSummaryDto;
import com.agileflow.dto.StorySummaryDto;
import com.agileflow.dto.UserSummaryDto;
import com.agileflow.entity.Project;
import com.agileflow.entity.SavedView;
import com.agileflow.entity.Task;
import com.agileflow.entity.User;
import com.agileflow.entity.UserStory;
import com.agileflow.exception.ForbiddenOperationException;
import com.agileflow.exception.ResourceNotFoundException;
import com.agileflow.repository.CommentRepository;
import com.agileflow.repository.ProjectMemberRepository;
import com.agileflow.repository.SavedViewRepository;
import com.agileflow.repository.TaskRepository;
import com.agileflow.repository.UserRepository;
import jakarta.persistence.criteria.Join;
import jakarta.persistence.criteria.JoinType;
import jakarta.persistence.criteria.Predicate;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class PlanningService {

    private static final Set<String> SORTABLE_FIELDS = Set.of(
            "dateCreation", "dateMiseAJour", "priorite", "statut", "dateEcheance", "titre"
    );
    private static final String[] AVATAR_COLORS = {
            "#1976D2", "#388E3C", "#F57C00", "#7B1FA2",
            "#C62828", "#00838F", "#4527A0", "#2E7D32"
    };

    private final TaskRepository taskRepository;
    private final UserRepository userRepository;
    private final CommentRepository commentRepository;
    private final SavedViewRepository savedViewRepository;
    private final ProjectAccessService projectAccessService;
    private final ProjectMemberRepository projectMemberRepository;
    private final TaskDeadlineHierarchyService taskDeadlineHierarchyService;

    @Transactional(readOnly = true)
    public PlanningPageResponse getPlanningTasks(
            Long projectId,
            Long sprintId,
            String statut,
            String priorite,
            Long assigneeId,
            String search,
            String groupBy,
            String sortBy,
            String sortDir,
            int page,
            int size
    ) {
        User actor = projectAccessService.currentUser();
        List<Task> tasks = findAccessibleTasks(actor, projectId, sprintId, statut, priorite, assigneeId, search, sortBy, sortDir);
        PlanningStatsDto stats = buildStats(tasks);

        int safeSize = Math.max(1, Math.min(size, 200));
        int safePage = Math.max(page, 0);
        int from = Math.min(safePage * safeSize, tasks.size());
        int to = Math.min(from + safeSize, tasks.size());
        List<Task> pageTasks = tasks.subList(from, to);
        int totalPages = tasks.isEmpty() ? 0 : (int) Math.ceil((double) tasks.size() / safeSize);

        return new PlanningPageResponse(
                groupTasks(pageTasks, normalizeGroupBy(groupBy)),
                tasks.size(),
                totalPages,
                safePage,
                stats
        );
    }

    @Transactional
    public PlanningTaskDto inlineEdit(Long id, InlineEditRequest request) {
        if (request == null || request.field() == null) {
            throw new IllegalArgumentException("Champ de modification requis");
        }

        Task task = getTask(id);
        User actor = projectAccessService.currentUser();
        assertCanEditField(actor, task, request.field());

        switch (request.field()) {
            case "titre" -> task.setTitre(request.value());
            case "description" -> task.setDescription(request.value());
            case "statut" -> {
                Task.Statut next = Task.Statut.valueOf(requireValue(request.value()));
                task.setStatut(next);
                if (next == Task.Statut.DONE) {
                    task.setDeadline24hReminderSent(true);
                    task.setDeadline1hReminderSent(true);
                }
                task.setUrgent(next != Task.Statut.DONE && isWithinUrgentWindow(task.getDateEcheance()));
            }
            case "priorite" -> task.setPriorite(Task.Priorite.valueOf(requireValue(request.value())));
            case "assigneeId" -> {
                if (request.value() == null || request.value().isBlank()) {
                    task.setAssignedTo(null);
                    task.setAssignedBy(null);
                } else {
                    Long assigneeId = Long.valueOf(request.value());
                    User assignee = userRepository.findById(assigneeId)
                            .orElseThrow(() -> new ResourceNotFoundException("Utilisateur assigne introuvable"));
                    assertProjectMemberOrOwner(task, assignee);
                    task.setAssignedTo(assignee);
                    task.setAssignedBy(actor);
                }
            }
            case "dateEcheance" -> {
                task.setDateEcheance(parseDateTime(request.value()));
                task.setDeadline24hReminderSent(false);
                task.setDeadline1hReminderSent(false);
                task.setUrgent(task.getStatut() != Task.Statut.DONE && isWithinUrgentWindow(task.getDateEcheance()));
                taskDeadlineHierarchyService.normalizeDeadlineHierarchy(task);
            }
            case "isUrgent" -> task.setUrgent(Boolean.parseBoolean(requireValue(request.value())) && task.getStatut() != Task.Statut.DONE);
            default -> throw new IllegalArgumentException("Champ non supporte: " + request.field());
        }

        return toPlanningTaskDto(taskRepository.save(task));
    }

    @Transactional
    public BulkActionResponse bulkAction(BulkActionRequest request) {
        if (request == null || request.taskIds() == null || request.taskIds().isEmpty()) {
            return new BulkActionResponse(0, 0, List.of());
        }

        User actor = projectAccessService.currentUser();
        int success = 0;
        List<String> errors = new ArrayList<>();

        for (Long taskId : request.taskIds()) {
            try {
                Task task = getTask(taskId);
                assertCanEditField(actor, task, "bulk");
                applyBulkAction(task, request);
                if ("DELETE".equalsIgnoreCase(request.action())) {
                    taskRepository.delete(task);
                } else {
                    taskRepository.save(task);
                }
                success++;
            } catch (Exception e) {
                errors.add("Tache " + taskId + ": " + e.getMessage());
            }
        }

        return new BulkActionResponse(success, request.taskIds().size() - success, errors);
    }

    @Transactional(readOnly = true)
    public List<SavedViewDto> getSavedViews() {
        User owner = projectAccessService.currentUser();
        return savedViewRepository.findByOwner_IdOrderByDateCreationDesc(owner.getId()).stream()
                .map(this::toSavedViewDto)
                .toList();
    }

    @Transactional
    public SavedViewDto createSavedView(SavedViewRequest request) {
        if (request == null || request.nom() == null || request.nom().isBlank()) {
            throw new IllegalArgumentException("Nom de vue requis");
        }
        User owner = projectAccessService.currentUser();
        SavedView view = SavedView.builder()
                .nom(request.nom().trim())
                .filtersJson(request.filtersJson())
                .owner(owner)
                .build();
        return toSavedViewDto(savedViewRepository.save(view));
    }

    @Transactional
    public void deleteSavedView(Long id) {
        User owner = projectAccessService.currentUser();
        SavedView view = savedViewRepository.findByIdAndOwner_Id(id, owner.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Vue sauvegardee introuvable"));
        savedViewRepository.delete(view);
    }

    @Transactional(readOnly = true)
    public byte[] exportCsv(
            Long projectId,
            Long sprintId,
            String statut,
            String priorite,
            Long assigneeId,
            String search,
            String groupBy,
            String sortBy,
            String sortDir
    ) {
        User actor = projectAccessService.currentUser();
        List<Task> tasks = findAccessibleTasks(actor, projectId, sprintId, statut, priorite, assigneeId, search, sortBy, sortDir);
        StringBuilder csv = new StringBuilder();
        csv.append("ID,Titre,Statut,Priorite,Assigne,Reporter,Sprint,Story,Date Creation,Date Mise a Jour,Date Echeance,Labels\n");
        for (Task task : tasks) {
            csv.append(csv(task.getId()))
                    .append(',').append(csv(task.getTitre()))
                    .append(',').append(csv(name(task.getStatut())))
                    .append(',').append(csv(name(task.getPriorite())))
                    .append(',').append(csv(userName(task.getAssignedTo())))
                    .append(',').append(csv(""))
                    .append(',').append(csv(task.getSprint() != null ? task.getSprint().getNom() : ""))
                    .append(',').append(csv(task.getStory() != null ? task.getStory().getTitre() : ""))
                    .append(',').append(csv(toIso(task.getDateCreation())))
                    .append(',').append(csv(toIso(task.getDateMiseAJour())))
                    .append(',').append(csv(toIso(task.getDateEcheance())))
                    .append(',').append(csv(String.join("|", task.getLabels() != null ? task.getLabels() : Set.of())))
                    .append('\n');
        }
        return csv.toString().getBytes(StandardCharsets.UTF_8);
    }

    private List<Task> findAccessibleTasks(
            User actor,
            Long projectId,
            Long sprintId,
            String statut,
            String priorite,
            Long assigneeId,
            String search,
            String sortBy,
            String sortDir
    ) {
        Specification<Task> spec = buildSpecification(projectId, sprintId, statut, priorite, assigneeId, search);
        Sort sort = buildSort(sortBy, sortDir);
        return taskRepository.findAll(spec, sort).stream()
                .filter(task -> canViewTask(actor, task))
                .sorted(buildNullFriendlyComparator(sortBy, sortDir))
                .toList();
    }

    private Specification<Task> buildSpecification(Long projectId, Long sprintId, String statut, String priorite, Long assigneeId, String search) {
        return (root, query, cb) -> {
            query.distinct(true);
            List<Predicate> predicates = new ArrayList<>();

            Join<Object, Object> directProject = root.join("project", JoinType.LEFT);
            Join<Object, Object> sprint = root.join("sprint", JoinType.LEFT);
            Join<Object, Object> sprintProject = sprint.join("project", JoinType.LEFT);
            Join<Object, Object> story = root.join("story", JoinType.LEFT);
            Join<Object, Object> backlog = story.join("backlog", JoinType.LEFT);
            Join<Object, Object> backlogProject = backlog.join("project", JoinType.LEFT);

            if (projectId != null) {
                predicates.add(cb.or(
                        cb.equal(directProject.get("id"), projectId),
                        cb.equal(sprintProject.get("id"), projectId),
                        cb.equal(backlogProject.get("id"), projectId)
                ));
            }
            if (sprintId != null) {
                predicates.add(cb.equal(sprint.get("id"), sprintId));
            }
            if (statut != null && !statut.isBlank()) {
                predicates.add(cb.equal(root.get("statut"), Task.Statut.valueOf(statut)));
            }
            if (priorite != null && !priorite.isBlank()) {
                predicates.add(cb.equal(root.get("priorite"), Task.Priorite.valueOf(priorite)));
            }
            if (assigneeId != null) {
                predicates.add(cb.equal(root.get("assignedTo").get("id"), assigneeId));
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

    private Sort buildSort(String sortBy, String sortDir) {
        String field = SORTABLE_FIELDS.contains(sortBy) ? sortBy : "dateCreation";
        Sort.Direction direction = "ASC".equalsIgnoreCase(sortDir) ? Sort.Direction.ASC : Sort.Direction.DESC;
        return Sort.by(direction, field);
    }

    private Comparator<Task> buildNullFriendlyComparator(String sortBy, String sortDir) {
        String field = SORTABLE_FIELDS.contains(sortBy) ? sortBy : "dateCreation";
        Comparator<Comparable<Object>> valueComparator = Comparator.nullsLast(Comparator.naturalOrder());
        Comparator<Task> comparator = Comparator.comparing(task -> comparableValue(task, field), valueComparator);
        return "ASC".equalsIgnoreCase(sortDir) ? comparator : comparator.reversed();
    }

    @SuppressWarnings({"unchecked", "rawtypes"})
    private Comparable<Object> comparableValue(Task task, String field) {
        return switch (field) {
            case "titre" -> (Comparable) safe(task.getTitre());
            case "statut" -> (Comparable) (task.getStatut() != null ? task.getStatut().name() : "");
            case "priorite" -> (Comparable) (task.getPriorite() != null ? task.getPriorite().name() : "");
            case "dateEcheance" -> (Comparable) task.getDateEcheance();
            case "dateMiseAJour" -> (Comparable) task.getDateMiseAJour();
            default -> (Comparable) task.getDateCreation();
        };
    }

    private List<PlanningGroupDto> groupTasks(List<Task> tasks, String groupBy) {
        Map<String, List<Task>> grouped = new LinkedHashMap<>();
        Map<Long, Task> visibleRootTasks = new LinkedHashMap<>();
        for (Task task : tasks) {
            Task root = rootTask(task);
            visibleRootTasks.putIfAbsent(root.getId(), root);
        }

        for (Task task : visibleRootTasks.values()) {
            String key = groupKey(task, groupBy);
            grouped.computeIfAbsent(key, ignored -> new ArrayList<>()).add(task);
        }

        return grouped.entrySet().stream()
                .map(entry -> {
                    List<PlanningTaskDto> taskDtos = entry.getValue().stream().map(this::toPlanningTaskDto).toList();
                    int doneCount = (int) entry.getValue().stream().filter(t -> t.getStatut() == Task.Statut.DONE).count();
                    return new PlanningGroupDto(
                            entry.getKey(),
                            groupLabel(entry.getValue().get(0), groupBy),
                            groupBy,
                            taskDtos,
                            taskDtos.size(),
                            doneCount
                    );
                })
                .toList();
    }

    private Task rootTask(Task task) {
        Task current = task;
        while (current.getParentTask() != null) {
            current = current.getParentTask();
        }
        return current;
    }

    public PlanningTaskDto toPlanningTaskDto(Task task) {
        return toPlanningTaskDto(task, true);
    }

    private PlanningTaskDto toPlanningTaskDto(Task task, boolean includeChildren) {
        UserStory story = task.getStory();
        Project project = resolveProject(task);

        List<PlanningTaskDto> sousTaskes = (includeChildren && task.getSousTaskes() != null)
                ? task.getSousTaskes().stream().map(t -> toPlanningTaskDto(t, false)).toList()
                : List.of();

        long doneCount = task.getSousTaskes() != null
                ? task.getSousTaskes().stream().filter(t -> t.getStatut() == Task.Statut.DONE).count()
                : 0;

        return new PlanningTaskDto(
                task.getId(),
                task.getTitre(),
                task.getDescription(),
                task.getType() != null ? task.getType().name() : Task.Type.TASK.name(),
                name(task.getStatut()),
                name(task.getPriorite()),
                task.getStatut() != Task.Statut.DONE && task.isUrgent(),
                toIso(task.getDateEcheance()),
                toIso(task.getDateCreation()),
                toIso(task.getDateMiseAJour()),
                task.getLabels() != null ? task.getLabels().stream().sorted().toList() : List.of(),
                toUserSummary(task.getAssignedTo()),
                toUserSummary(task.getAssignedBy()),
                task.getSprint() != null ? new SprintSummaryDto(task.getSprint().getId(), task.getSprint().getNom(), name(task.getSprint().getStatut())) : null,
                story != null ? new StorySummaryDto(story.getId(), story.getTitre(), name(story.getPriority())) : null,
                project != null ? new ProjectSummaryDto(project.getId(), project.getNom(), issuePrefix(project)) : null,
                commentRepository.countByTask_Id(task.getId()),
                task.getSousTaskes() != null ? task.getSousTaskes().size() : 0,
                updatedAgo(task.getDateMiseAJour() != null ? task.getDateMiseAJour() : task.getDateCreation()),
                task.getTypeTache() != null ? task.getTypeTache().name() : Task.Type.TASK.name(),
                task.getParentTask() != null ? task.getParentTask().getId() : null,
                task.getParentTask() != null ? task.getParentTask().getTitre() : null,
                sousTaskes,
                task.getSousTaskes() != null ? task.getSousTaskes().size() : 0,
                (int) doneCount,
                task.getGithubIssueNumber(),
                task.getGithubIssueUrl(),
                task.getGithubPrNumber(),
                task.getGithubPrUrl()
        );
    }

    private PlanningStatsDto buildStats(List<Task> tasks) {
        LocalDateTime now = LocalDateTime.now();
        return new PlanningStatsDto(
                tasks.size(),
                tasks.stream().filter(t -> t.getStatut() == Task.Statut.TODO).count(),
                tasks.stream().filter(t -> t.getStatut() == Task.Statut.IN_PROGRESS).count(),
                tasks.stream().filter(t -> t.getStatut() == Task.Statut.REVIEW).count(),
                tasks.stream().filter(t -> t.getStatut() == Task.Statut.DONE).count(),
                tasks.stream().filter(t -> t.getStatut() != Task.Statut.DONE && t.isUrgent()).count(),
                tasks.stream().filter(t -> t.getDateEcheance() != null && t.getDateEcheance().isBefore(now) && t.getStatut() != Task.Statut.DONE).count()
        );
    }

    private String issuePrefix(Project project) {
        return project != null && project.getIssuePrefix() != null && !project.getIssuePrefix().isBlank()
                ? project.getIssuePrefix()
                : "KAN";
    }

    private void applyBulkAction(Task task, BulkActionRequest request) {
        String action = request.action() != null ? request.action().toUpperCase(Locale.ROOT) : "";
        switch (action) {
            case "UPDATE_STATUS" -> {
                Task.Statut next = Task.Statut.valueOf(requireValue(request.value()));
                task.setStatut(next);
                task.setUrgent(next != Task.Statut.DONE && isWithinUrgentWindow(task.getDateEcheance()));
            }
            case "UPDATE_PRIORITY" -> task.setPriorite(Task.Priorite.valueOf(requireValue(request.value())));
            case "ASSIGN" -> {
                Long assigneeId = request.assigneeId();
                if (assigneeId == null && request.value() != null && !request.value().isBlank()) {
                    assigneeId = Long.valueOf(request.value());
                }
                if (assigneeId == null) {
                    task.setAssignedTo(null);
                    task.setAssignedBy(null);
                } else {
                    Long finalAssigneeId = assigneeId;
                    User assignee = userRepository.findById(finalAssigneeId)
                            .orElseThrow(() -> new ResourceNotFoundException("Utilisateur assigne introuvable"));
                    assertProjectMemberOrOwner(task, assignee);
                    task.setAssignedTo(assignee);
                    task.setAssignedBy(projectAccessService.currentUser());
                }
            }
            case "DELETE" -> {
            }
            default -> throw new IllegalArgumentException("Action bulk non supportee: " + request.action());
        }
    }

    private void assertCanEditField(User actor, Task task, String field) {
        Project project = resolveProject(task);
        if (project == null) {
            if (!projectAccessService.isPlatformAdmin(actor) && !Objects.equals(task.getAssignedTo() != null ? task.getAssignedTo().getId() : null, actor.getId())) {
                throw new ForbiddenOperationException("Vous ne pouvez pas modifier cette tache");
            }
            return;
        }
        if (projectAccessService.canEditProjectContent(actor, project)) {
            return;
        }
        if ("statut".equals(field) && actor.getRole() == User.Role.ROLE_DEVELOPER
                && task.getAssignedTo() != null && Objects.equals(task.getAssignedTo().getId(), actor.getId())) {
            return;
        }
        throw new ForbiddenOperationException("Vous ne pouvez pas modifier cette tache");
    }

    private void assertProjectMemberOrOwner(Task task, User assignee) {
        Project project = resolveProject(task);
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

    private boolean canViewTask(User actor, Task task) {
        Project project = resolveProject(task);
        if (project != null) {
            return projectAccessService.hasProjectAccess(actor, project);
        }
        return projectAccessService.isPlatformAdmin(actor)
                || (task.getAssignedTo() != null && Objects.equals(task.getAssignedTo().getId(), actor.getId()));
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

    private String normalizeGroupBy(String groupBy) {
        if (groupBy == null || groupBy.isBlank()) {
            return "NONE";
        }
        return switch (groupBy.toUpperCase(Locale.ROOT)) {
            case "SPRINT", "STORY", "ASSIGNEE", "STATUT", "NONE" -> groupBy.toUpperCase(Locale.ROOT);
            default -> "NONE";
        };
    }

    private String groupKey(Task task, String groupBy) {
        return switch (groupBy) {
            case "SPRINT" -> task.getSprint() != null ? String.valueOf(task.getSprint().getId()) : "backlog";
            case "STORY" -> task.getStory() != null ? String.valueOf(task.getStory().getId()) : "no-story";
            case "ASSIGNEE" -> task.getAssignedTo() != null ? String.valueOf(task.getAssignedTo().getId()) : "unassigned";
            case "STATUT" -> task.getStatut() != null ? task.getStatut().name() : "NONE";
            default -> "all";
        };
    }

    private String groupLabel(Task task, String groupBy) {
        return switch (groupBy) {
            case "SPRINT" -> task.getSprint() != null ? task.getSprint().getNom() : "Backlog";
            case "STORY" -> task.getStory() != null ? task.getStory().getTitre() : "Sans story";
            case "ASSIGNEE" -> task.getAssignedTo() != null ? userName(task.getAssignedTo()) : "Non assigne";
            case "STATUT" -> task.getStatut() != null ? task.getStatut().name() : "Sans statut";
            default -> "Toutes les taches";
        };
    }

    private UserSummaryDto toUserSummary(User user) {
        if (user == null) {
            return null;
        }
        return new UserSummaryDto(
                user.getId(),
                user.getNom(),
                user.getPrenom(),
                user.getEmail(),
                initials(user),
                avatarColor(user.getEmail())
        );
    }

    private SavedViewDto toSavedViewDto(SavedView view) {
        return new SavedViewDto(view.getId(), view.getNom(), view.getFiltersJson());
    }

    private Task getTask(Long id) {
        return taskRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Tache introuvable"));
    }

    private LocalDateTime parseDateTime(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        try {
            return LocalDateTime.parse(value);
        } catch (DateTimeParseException ignored) {
            return LocalDate.parse(value).atStartOfDay();
        }
    }

    private boolean isWithinUrgentWindow(LocalDateTime dateEcheance) {
        LocalDateTime now = LocalDateTime.now();
        return dateEcheance != null && dateEcheance.isAfter(now) && !dateEcheance.isAfter(now.plusHours(24));
    }

    private String updatedAgo(LocalDateTime date) {
        if (date == null) {
            return "jamais";
        }
        Duration duration = Duration.between(date, LocalDateTime.now());
        long minutes = Math.max(duration.toMinutes(), 0);
        if (minutes < 1) return "a l'instant";
        if (minutes < 60) return "il y a " + minutes + "min";
        long hours = minutes / 60;
        if (hours < 24) return "il y a " + hours + "h";
        long days = hours / 24;
        if (days < 30) return "il y a " + days + "j";
        long months = days / 30;
        return "il y a " + months + " mois";
    }

    private String initials(User user) {
        String prenom = user.getPrenom() != null && !user.getPrenom().isBlank() ? user.getPrenom().substring(0, 1) : "";
        String nom = user.getNom() != null && !user.getNom().isBlank() ? user.getNom().substring(0, 1) : "";
        String fallback = user.getEmail() != null && !user.getEmail().isBlank() ? user.getEmail().substring(0, 1) : "?";
        String result = (prenom + nom).isBlank() ? fallback : prenom + nom;
        return result.toUpperCase(Locale.ROOT);
    }

    private String avatarColor(String email) {
        int hash = 0;
        String value = email != null ? email : "";
        for (char c : value.toCharArray()) {
            hash = c + ((hash << 5) - hash);
        }
        return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
    }

    private String userName(User user) {
        if (user == null) {
            return "";
        }
        return safe(user.getPrenom()) + " " + safe(user.getNom());
    }

    private String requireValue(String value) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException("Valeur requise");
        }
        return value;
    }

    private String safe(String value) {
        return value != null ? value : "";
    }

    private String name(Enum<?> value) {
        return value != null ? value.name() : null;
    }

    private String toIso(LocalDateTime value) {
        return value != null ? value.toString() : null;
    }

    private String csv(Object value) {
        String text = value == null ? "" : String.valueOf(value);
        return "\"" + text.replace("\"", "\"\"") + "\"";
    }
}
