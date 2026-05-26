package com.agileflow.service;

import com.agileflow.dto.ProjectSummaryDto;
import com.agileflow.dto.SprintSummaryDto;
import com.agileflow.dto.StorySummaryDto;
import com.agileflow.dto.UserSummaryDto;
import com.agileflow.dto.timeline.CreateTimelineEpicRequest;
import com.agileflow.dto.timeline.TimelineDto;
import com.agileflow.dto.timeline.TimelineEpicDto;
import com.agileflow.dto.timeline.TimelinePeriodeDto;
import com.agileflow.dto.timeline.TimelineStatsDto;
import com.agileflow.dto.timeline.TimelineTaskDto;
import com.agileflow.dto.timeline.UpdateDatesRequest;
import com.agileflow.entity.ActivityLog;
import com.agileflow.entity.Project;
import com.agileflow.entity.Task;
import com.agileflow.entity.TypeTache;
import com.agileflow.entity.User;
import com.agileflow.entity.UserStory;
import com.agileflow.exception.ForbiddenOperationException;
import com.agileflow.exception.ResourceNotFoundException;
import com.agileflow.repository.CommentRepository;
import com.agileflow.repository.ProjectMemberRepository;
import com.agileflow.repository.TaskRepository;
import com.agileflow.repository.UserRepository;
import jakarta.persistence.criteria.Join;
import jakarta.persistence.criteria.JoinType;
import jakarta.persistence.criteria.Predicate;
import lombok.RequiredArgsConstructor;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.time.format.DateTimeParseException;
import java.time.temporal.IsoFields;
import java.time.temporal.WeekFields;
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
public class TimelineService {

    private static final String[] EPIC_COLORS = {
            "#A855F7", "#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#EC4899"
    };
    private static final String[] AVATAR_COLORS = {
            "#0052CC", "#00875A", "#DE350B", "#6B3DC9", "#FF991F", "#00B8D9", "#36B37E", "#6554C0"
    };

    private final TaskRepository taskRepository;
    private final UserRepository userRepository;
    private final CommentRepository commentRepository;
    private final ProjectMemberRepository projectMemberRepository;
    private final ProjectAccessService projectAccessService;
    private final ActivityLogger activityLogger;
    private final TaskDeadlineHierarchyService taskDeadlineHierarchyService;

    @Transactional(readOnly = true)
    public TimelineDto getTimeline(Long projectId, Long epicId, String type, String statut, Long assigneeId, String search, String vue) {
        User actor = projectAccessService.currentUser();
        Project project = projectAccessService.getProjectOrThrow(projectId);
        projectAccessService.assertProjectAccess(actor, project);

        List<Task> allTasks = taskRepository.findAll(buildSpecification(projectId, type, statut, assigneeId, search))
                .stream()
                .sorted(Comparator.comparing(Task::getDateCreation, Comparator.nullsLast(Comparator.naturalOrder())))
                .toList();

        Map<Long, TimelineEpicDto> epics = new LinkedHashMap<>();
        List<Task> visibleTasks = allTasks.stream().filter(task -> task.getTypeTache() != TypeTache.SUBTASK).toList();

        for (Task epicTask : visibleTasks.stream().filter(task -> task.getTypeTache() == TypeTache.EPIC).toList()) {
            if (epicId != null && !Objects.equals(epicTask.getId(), epicId)) {
                continue;
            }
            List<Task> children = allTasks.stream()
                    .filter(task -> task.getParentTask() != null && Objects.equals(task.getParentTask().getId(), epicTask.getId()))
                    .filter(task -> task.getTypeTache() != TypeTache.SUBTASK)
                    .toList();
            epics.put(epicTask.getId(), toEpicDto(epicTask, children));
        }

        for (Task task : visibleTasks) {
            if (task.getTypeTache() == TypeTache.EPIC) {
                continue;
            }
            Task parentEpic = parentEpic(task);
            if (parentEpic != null) {
                if (epicId == null || Objects.equals(parentEpic.getId(), epicId)) {
                    epics.computeIfAbsent(parentEpic.getId(), id -> toEpicDto(parentEpic, List.of()));
                }
            }
        }

        List<Task> periodTasks = visibleTasks.isEmpty() ? allTasks : visibleTasks;
        return new TimelineDto(
                new ProjectSummaryDto(project.getId(), project.getNom()),
                new ArrayList<>(epics.values()),
                List.of(),
                buildPeriode(periodTasks),
                buildStats(visibleTasks)
        );
    }

    @Transactional
    public TimelineTaskDto updateDates(Long taskId, UpdateDatesRequest request) {
        User actor = projectAccessService.currentUser();
        Task task = taskRepository.findById(taskId)
                .orElseThrow(() -> new ResourceNotFoundException("Tache introuvable"));
        Project project = resolveProject(task);
        if (project == null) {
            throw new ResourceNotFoundException("Projet de la tache introuvable");
        }
        if (!projectAccessService.canEditProjectContent(actor, project)) {
            if (task.getAssignedTo() == null || !Objects.equals(task.getAssignedTo().getId(), actor.getId())) {
                throw new ForbiddenOperationException("Vous ne pouvez modifier que vos taches");
            }
        }

        task.setDateDebut(parseDateTime(request.dateDebut()));
        task.setDateEcheance(parseDateTime(request.dateFin()));
        task.setUrgent(task.getStatut() != Task.Statut.DONE && isWithinUrgentWindow(task.getDateEcheance()));
        taskDeadlineHierarchyService.normalizeDeadlineHierarchy(task);
        Task saved = taskRepository.save(task);
        activityLogger.log(actor, ActivityLog.Action.TASK_UPDATED, "Dates modifiees: " + saved.getTitre(), project, saved.getSprint(), saved);
        return toTaskDto(saved, parentEpic(saved) != null ? parentEpic(saved).getId() : null);
    }

    @Transactional
    public TimelineEpicDto createEpic(CreateTimelineEpicRequest request) {
        User actor = projectAccessService.currentUser();
        Project project = projectAccessService.getProjectOrThrow(request.projectId());
        projectAccessService.assertCanEditProjectContent(actor, project);

        User assignee = null;
        if (request.assigneeId() != null) {
            assignee = userRepository.findById(request.assigneeId())
                    .orElseThrow(() -> new ResourceNotFoundException("Utilisateur assigne introuvable"));
            assertProjectMemberOrOwner(project, assignee);
        }

        Task epic = Task.builder()
                .titre(request.titre().trim())
                .description(request.description())
                .type(Task.Type.EPIC)
                .typeTache(TypeTache.EPIC)
                .statut(Task.Statut.TODO)
                .priorite(Task.Priorite.MEDIUM)
                .dateDebut(parseDateTime(request.dateDebut()))
                .dateEcheance(parseDateTime(request.dateFin()))
                .project(project)
                .assignedTo(assignee)
                .assignedBy(assignee != null ? actor : null)
                .labels(Set.of())
                .build();
        Task saved = taskRepository.save(epic);
        activityLogger.log(actor, ActivityLog.Action.TASK_CREATED, "Epic cree: " + saved.getTitre(), project, null, saved);
        return toEpicDto(saved, List.of());
    }

    private Specification<Task> buildSpecification(Long projectId, String type, String statut, Long assigneeId, String search) {
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
            if (type != null && !type.isBlank()) {
                predicates.add(cb.equal(root.get("typeTache"), TypeTache.valueOf(type)));
            }
            if (statut != null && !statut.isBlank()) {
                predicates.add(cb.equal(root.get("statut"), Task.Statut.valueOf(statut)));
            }
            if (assigneeId != null) {
                predicates.add(cb.equal(root.get("assignedTo").get("id"), assigneeId));
            }
            if (search != null && !search.isBlank()) {
                String like = "%" + search.toLowerCase(Locale.ROOT).trim() + "%";
                predicates.add(cb.or(
                        cb.like(cb.lower(root.get("titre")), like),
                        cb.like(cb.lower(root.get("description")), like)
                ));
            }
            return cb.and(predicates.toArray(Predicate[]::new));
        };
    }

    private TimelineEpicDto toEpicDto(Task epic, List<Task> children) {
        List<TimelineTaskDto> taches = children.stream()
                .filter(task -> task.getTypeTache() != TypeTache.SUBTASK)
                .map(task -> toTaskDto(task, epic.getId()))
                .toList();
        int done = (int) taches.stream().filter(task -> "DONE".equals(task.statut())).count();
        LocalDateTime start = firstNonNull(epic.getDateDebut(), minDate(children, true), epic.getDateCreation());
        LocalDateTime end = firstNonNull(latest(epic.getDateEcheance(), maxDate(children)), start != null ? start.plusDays(14) : null);
        return new TimelineEpicDto(
                epic.getId(),
                epic.getTitre(),
                name(epic.getStatut()),
                name(epic.getPriorite()),
                toIso(start),
                toIso(end),
                getCouleurEpic(epic.getId()),
                toUserSummary(epic.getAssignedTo()),
                taches,
                taches.size(),
                done,
                true
        );
    }

    private TimelineTaskDto toTaskDto(Task task, Long parentEpicId) {
        UserStory story = task.getStory();
        return new TimelineTaskDto(
                task.getId(),
                task.getTitre(),
                name(task.getStatut()),
                name(task.getPriorite()),
                task.getTypeTache() != null ? task.getTypeTache().name() : TypeTache.TASK.name(),
                toIso(firstNonNull(task.getDateDebut(), task.getDateCreation())),
                toIso(task.getDateEcheance()),
                task.getStatut() != Task.Statut.DONE && task.isUrgent(),
                task.getLabels() != null ? task.getLabels().stream().sorted().toList() : List.of(),
                toUserSummary(task.getAssignedTo()),
                task.getSprint() != null ? new SprintSummaryDto(task.getSprint().getId(), task.getSprint().getNom(), name(task.getSprint().getStatut())) : null,
                story != null ? new StorySummaryDto(story.getId(), story.getTitre(), name(story.getPriority())) : null,
                parentEpicId,
                commentRepository.countByTask_Id(task.getId()),
                task.getDateEcheance() != null
        );
    }

    private TimelinePeriodeDto buildPeriode(List<Task> tasks) {
        LocalDate today = LocalDate.now();
        LocalDate min = tasks.stream()
                .map(task -> firstNonNull(task.getDateDebut(), task.getDateCreation(), task.getDateEcheance()))
                .filter(Objects::nonNull)
                .map(LocalDateTime::toLocalDate)
                .min(LocalDate::compareTo)
                .orElse(today.minusMonths(1).withDayOfMonth(1));
        LocalDate max = tasks.stream()
                .map(task -> firstNonNull(task.getDateEcheance(), task.getDateDebut(), task.getDateCreation()))
                .filter(Objects::nonNull)
                .map(LocalDateTime::toLocalDate)
                .max(LocalDate::compareTo)
                .orElse(today.plusMonths(3))
                .plusMonths(1);
        return new TimelinePeriodeDto(
                min.toString(),
                max.toString(),
                today.toString(),
                monthsBetween(min, max),
                weeksBetween(min, max),
                quartersBetween(min, max)
        );
    }

    private TimelineStatsDto buildStats(List<Task> tasks) {
        return new TimelineStatsDto(
                tasks.size(),
                tasks.stream().filter(task -> task.getDateEcheance() != null).count(),
                tasks.stream().filter(task -> task.getDateEcheance() == null).count(),
                tasks.stream().filter(task -> task.getStatut() == Task.Statut.TODO).count(),
                tasks.stream().filter(task -> task.getStatut() == Task.Statut.IN_PROGRESS).count(),
                tasks.stream().filter(task -> task.getStatut() == Task.Statut.REVIEW).count(),
                tasks.stream().filter(task -> task.getStatut() == Task.Statut.DONE).count()
        );
    }

    private List<String> monthsBetween(LocalDate min, LocalDate max) {
        List<String> values = new ArrayList<>();
        YearMonth current = YearMonth.from(min);
        YearMonth end = YearMonth.from(max);
        while (!current.isAfter(end)) {
            values.add(current.toString());
            current = current.plusMonths(1);
        }
        return values;
    }

    private List<String> weeksBetween(LocalDate min, LocalDate max) {
        List<String> values = new ArrayList<>();
        LocalDate current = min.with(WeekFields.ISO.dayOfWeek(), 1);
        while (!current.isAfter(max)) {
            int week = current.get(WeekFields.ISO.weekOfWeekBasedYear());
            int year = current.get(WeekFields.ISO.weekBasedYear());
            values.add(year + "-W" + String.format("%02d", week));
            current = current.plusWeeks(1);
        }
        return values;
    }

    private List<String> quartersBetween(LocalDate min, LocalDate max) {
        List<String> values = new ArrayList<>();
        LocalDate current = min.withDayOfMonth(1);
        while (!current.isAfter(max)) {
            String quarter = current.getYear() + "-Q" + current.get(IsoFields.QUARTER_OF_YEAR);
            if (!values.contains(quarter)) {
                values.add(quarter);
            }
            current = current.plusMonths(1);
        }
        return values;
    }

    private Task parentEpic(Task task) {
        Task current = task.getParentTask();
        while (current != null) {
            if (current.getTypeTache() == TypeTache.EPIC) {
                return current;
            }
            current = current.getParentTask();
        }
        return null;
    }

    private Project resolveProject(Task task) {
        if (task.getProject() != null) return task.getProject();
        if (task.getSprint() != null) return task.getSprint().getProject();
        if (task.getStory() != null && task.getStory().getBacklog() != null) return task.getStory().getBacklog().getProject();
        return null;
    }

    private void assertProjectMemberOrOwner(Project project, User assignee) {
        boolean isOwner = project.getManager() != null && Objects.equals(project.getManager().getId(), assignee.getId());
        boolean isMember = projectMemberRepository.existsByProject_IdAndUser_Id(project.getId(), assignee.getId());
        if (!isOwner && !isMember) {
            throw new ForbiddenOperationException("Vous pouvez assigner uniquement un membre du projet");
        }
    }

    private String getCouleurEpic(Long epicId) {
        return EPIC_COLORS[(int) Math.floorMod(epicId, EPIC_COLORS.length)];
    }

    private UserSummaryDto toUserSummary(User user) {
        if (user == null) return null;
        return new UserSummaryDto(user.getId(), user.getNom(), user.getPrenom(), user.getEmail(), initials(user), avatarColor(user.getEmail()));
    }

    private LocalDateTime parseDateTime(String value) {
        if (value == null || value.isBlank()) return null;
        try {
            return LocalDateTime.parse(value);
        } catch (DateTimeParseException ignored) {
            return LocalDate.parse(value).atStartOfDay();
        }
    }

    @SafeVarargs
    private final <T> T firstNonNull(T... values) {
        for (T value : values) {
            if (value != null) return value;
        }
        return null;
    }

    private LocalDateTime minDate(List<Task> tasks, boolean start) {
        return tasks.stream()
                .map(task -> start ? firstNonNull(task.getDateDebut(), task.getDateCreation()) : task.getDateEcheance())
                .filter(Objects::nonNull)
                .min(LocalDateTime::compareTo)
                .orElse(null);
    }

    private LocalDateTime maxDate(List<Task> tasks) {
        return tasks.stream()
                .map(task -> firstNonNull(task.getDateEcheance(), task.getDateDebut(), task.getDateCreation()))
                .filter(Objects::nonNull)
                .max(LocalDateTime::compareTo)
                .orElse(null);
    }

    private LocalDateTime latest(LocalDateTime left, LocalDateTime right) {
        if (left == null) {
            return right;
        }
        if (right == null) {
            return left;
        }
        return left.isAfter(right) ? left : right;
    }

    private boolean isWithinUrgentWindow(LocalDateTime dateEcheance) {
        LocalDateTime now = LocalDateTime.now();
        return dateEcheance != null && dateEcheance.isAfter(now) && !dateEcheance.isAfter(now.plusHours(24));
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

    private String name(Enum<?> value) {
        return value != null ? value.name() : null;
    }

    private String toIso(LocalDateTime value) {
        return value != null ? value.toString() : null;
    }
}
