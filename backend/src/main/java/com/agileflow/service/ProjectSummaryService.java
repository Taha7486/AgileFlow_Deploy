package com.agileflow.service;

import com.agileflow.dto.summary.ActivityGroupDto;
import com.agileflow.dto.summary.ActivityItemDto;
import com.agileflow.dto.summary.EpicProgressDto;
import com.agileflow.dto.summary.KpiStatsDto;
import com.agileflow.dto.summary.PriorityBreakdownDto;
import com.agileflow.dto.summary.ProjectDetailDto;
import com.agileflow.dto.summary.ProjectSummaryDto;
import com.agileflow.dto.summary.StatusOverviewDto;
import com.agileflow.dto.summary.StatusSegmentDto;
import com.agileflow.dto.summary.TypesOfWorkDto;
import com.agileflow.dto.summary.WorkloadDto;
import com.agileflow.entity.ActivityLog;
import com.agileflow.entity.Project;
import com.agileflow.entity.Task;
import com.agileflow.entity.TypeTache;
import com.agileflow.entity.User;
import com.agileflow.repository.ActivityLogRepository;
import com.agileflow.repository.TaskRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.TextStyle;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;

@Service
@RequiredArgsConstructor
public class ProjectSummaryService {

    private static final String[] EPIC_COLORS = {"#A855F7", "#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#EC4899"};
    private static final String[] AVATAR_COLORS = {"#0052CC", "#00875A", "#DE350B", "#6B3DC9", "#FF991F", "#00B8D9", "#36B37E", "#6554C0"};

    private final ProjectAccessService projectAccessService;
    private final TaskRepository taskRepository;
    private final ActivityLogRepository activityLogRepository;

    @Transactional(readOnly = true)
    public ProjectSummaryDto getSummary(Long projectId, int jours) {
        Project project = accessibleProject(projectId);
        int safeDays = Math.max(1, Math.min(jours, 365));
        List<Task> tasks = taskRepository.findByAnyProjectId(projectId);
        return new ProjectSummaryDto(
                toProjectDetail(project),
                buildKpi(tasks, safeDays),
                buildStatusOverview(tasks),
                buildPriorityBreakdown(tasks),
                buildTypesOfWork(tasks),
                buildTeamWorkload(tasks),
                buildEpicProgress(tasks),
                getRecentActivity(projectId, 0, 20)
        );
    }

    @Transactional(readOnly = true)
    public List<ActivityGroupDto> getRecentActivity(Long projectId, int page, int size) {
        accessibleProject(projectId);
        Pageable pageable = PageRequest.of(Math.max(page, 0), Math.max(1, Math.min(size, 100)));
        List<ActivityLog> logs = activityLogRepository.findByProjectIdOrderByCreatedAtDesc(projectId, pageable).getContent();
        Map<LocalDate, List<ActivityItemDto>> grouped = new LinkedHashMap<>();
        for (ActivityLog log : logs) {
            LocalDate date = log.getActivityDate() != null
                    ? log.getActivityDate()
                    : (log.getCreatedAt() != null ? log.getCreatedAt().toLocalDate() : LocalDate.now());
            grouped.computeIfAbsent(date, ignored -> new ArrayList<>()).add(toActivityItem(log));
        }
        return grouped.entrySet().stream()
                .map(entry -> new ActivityGroupDto(formatDateLabel(entry.getKey()), entry.getKey().toString(), entry.getValue()))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<WorkloadDto> getTeamWorkload(Long projectId) {
        accessibleProject(projectId);
        return buildTeamWorkload(taskRepository.findByAnyProjectId(projectId));
    }

    @Transactional(readOnly = true)
    public List<EpicProgressDto> getEpicProgress(Long projectId) {
        accessibleProject(projectId);
        return buildEpicProgress(taskRepository.findByAnyProjectId(projectId));
    }

    private Project accessibleProject(Long projectId) {
        User actor = projectAccessService.currentUser();
        Project project = projectAccessService.getProjectOrThrow(projectId);
        projectAccessService.assertProjectAccess(actor, project);
        return project;
    }

    private KpiStatsDto buildKpi(List<Task> tasks, int days) {
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime past = now.minusDays(days);
        LocalDateTime future = now.plusDays(days);
        long completed = tasks.stream().filter(task -> task.getStatut() == Task.Statut.DONE && dateAfterOrEqual(task.getDateMiseAJour(), past)).count();
        long updated = tasks.stream().filter(task -> task.getStatut() != Task.Statut.DONE && dateAfterOrEqual(task.getDateMiseAJour(), past)).count();
        long created = tasks.stream().filter(task -> dateAfterOrEqual(task.getDateCreation(), past)).count();
        long dueSoon = tasks.stream().filter(task -> task.getStatut() != Task.Statut.DONE && task.getDateEcheance() != null && !task.getDateEcheance().isBefore(now) && !task.getDateEcheance().isAfter(future)).count();
        return new KpiStatsDto(completed, updated, created, dueSoon, days);
    }

    private StatusOverviewDto buildStatusOverview(List<Task> tasks) {
        long todo = countStatus(tasks, Task.Statut.TODO);
        long inProgress = countStatus(tasks, Task.Statut.IN_PROGRESS);
        long review = countStatus(tasks, Task.Statut.REVIEW);
        long done = countStatus(tasks, Task.Statut.DONE);
        long total = tasks.size();
        return new StatusOverviewDto(total, todo, inProgress, review, done, List.of(
                segment("TODO", "A faire", todo, total, "#DFE1E6"),
                segment("IN_PROGRESS", "En cours", inProgress, total, "#0052CC"),
                segment("REVIEW", "En revision", review, total, "#36B37E"),
                segment("DONE", "Termine", done, total, "#00875A")
        ));
    }

    private PriorityBreakdownDto buildPriorityBreakdown(List<Task> tasks) {
        return new PriorityBreakdownDto(
                countPriority(tasks, Task.Priorite.CRITICAL),
                countPriority(tasks, Task.Priorite.HIGH),
                countPriority(tasks, Task.Priorite.MEDIUM),
                countPriority(tasks, Task.Priorite.LOW),
                0
        );
    }

    private TypesOfWorkDto buildTypesOfWork(List<Task> tasks) {
        long epic = countType(tasks, TypeTache.EPIC);
        long story = countType(tasks, TypeTache.STORY);
        long task = countType(tasks, TypeTache.TASK);
        long feature = countType(tasks, TypeTache.FEATURE);
        long bug = countType(tasks, TypeTache.BUG);
        long subtask = countType(tasks, TypeTache.SUBTASK);
        return new TypesOfWorkDto(story, epic, task, feature, bug, subtask, tasks.size());
    }

    private List<WorkloadDto> buildTeamWorkload(List<Task> tasks) {
        Map<User, Long> grouped = new LinkedHashMap<>();
        for (Task task : tasks) {
            if (task.getAssignedTo() != null) {
                grouped.merge(task.getAssignedTo(), 1L, Long::sum);
            }
        }
        long totalAssigned = grouped.values().stream().mapToLong(Long::longValue).sum();
        return grouped.entrySet().stream()
                .map(entry -> {
                    User user = entry.getKey();
                    long count = entry.getValue();
                    return new WorkloadDto(user.getId(), user.getNom(), user.getPrenom(), initials(user), avatarColor(user.getEmail()), count, percent(count, totalAssigned));
                })
                .sorted(Comparator.comparingLong(WorkloadDto::tachesAssignees).reversed())
                .toList();
    }

    private List<EpicProgressDto> buildEpicProgress(List<Task> tasks) {
        return tasks.stream()
                .filter(task -> task.getTypeTache() == TypeTache.EPIC)
                .map(epic -> {
                    List<Task> children = tasks.stream()
                            .filter(task -> task.getParentTask() != null && Objects.equals(task.getParentTask().getId(), epic.getId()))
                            .filter(task -> task.getTypeTache() != TypeTache.SUBTASK)
                            .toList();
                    long done = children.stream().filter(task -> task.getStatut() == Task.Statut.DONE).count();
                    return new EpicProgressDto(epic.getId(), epic.getTitre(), name(epic.getStatut()), getEpicColor(epic.getId()), children.size(), done, percent(done, children.size()));
                })
                .toList();
    }

    private ActivityItemDto toActivityItem(ActivityLog log) {
        User actor = log.getActor();
        Task task = log.getTask();
        return new ActivityItemDto(
                actor != null ? actor.getId() : null,
                actor != null ? ((safe(actor.getPrenom()) + " " + safe(actor.getNom())).trim()) : "Systeme",
                actor != null ? initials(actor) : "?",
                actor != null ? avatarColor(actor.getEmail()) : "#6B778C",
                actionLabel(log.getAction()),
                fieldLabel(log),
                "sur",
                task != null ? task.getId() : null,
                task != null ? "KAN-" + task.getId() + ": " + task.getTitre() : safe(log.getMessage()),
                task != null ? name(task.getStatut()) : null,
                task != null && task.getTypeTache() != null ? task.getTypeTache().name() : null,
                relative(log.getCreatedAt()),
                log.getCreatedAt() != null ? log.getCreatedAt().toString() : null
        );
    }

    private StatusSegmentDto segment(String statut, String label, long count, long total, String color) {
        return new StatusSegmentDto(statut, label, count, percent(count, total), color);
    }

    private boolean dateAfterOrEqual(LocalDateTime date, LocalDateTime min) {
        return date != null && !date.isBefore(min);
    }

    private long countStatus(List<Task> tasks, Task.Statut statut) {
        return tasks.stream().filter(task -> task.getStatut() == statut).count();
    }

    private long countPriority(List<Task> tasks, Task.Priorite priorite) {
        return tasks.stream().filter(task -> task.getPriorite() == priorite).count();
    }

    private long countType(List<Task> tasks, TypeTache type) {
        return tasks.stream().filter(task -> task.getTypeTache() == type).count();
    }

    private double percent(long value, long total) {
        if (total <= 0) {
            return 0;
        }
        return Math.round((value * 1000.0) / total) / 10.0;
    }

    private ProjectDetailDto toProjectDetail(Project project) {
        return new ProjectDetailDto(project.getId(), project.getNom(), name(project.getStatut()));
    }

    private String getEpicColor(Long id) {
        return EPIC_COLORS[(int) Math.floorMod(id != null ? id : 0, EPIC_COLORS.length)];
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
        return AVATAR_COLORS[Math.floorMod(hash, AVATAR_COLORS.length)];
    }

    private String formatDateLabel(LocalDate date) {
        String day = date.getDayOfWeek().getDisplayName(TextStyle.FULL, Locale.FRANCE);
        String month = date.getMonth().getDisplayName(TextStyle.FULL, Locale.FRANCE);
        return capitalize(day) + " " + date.getDayOfMonth() + " " + month + " " + date.getYear();
    }

    private String relative(LocalDateTime date) {
        if (date == null) {
            return "";
        }
        Duration duration = Duration.between(date, LocalDateTime.now());
        long minutes = Math.max(duration.toMinutes(), 0);
        if (minutes < 1) return "a l'instant";
        if (minutes < 60) return "il y a " + minutes + " min";
        long hours = minutes / 60;
        if (hours < 24) return "il y a " + hours + "h";
        long days = hours / 24;
        if (days < 30) return "il y a " + days + "j";
        return "il y a " + (days / 30) + " mois";
    }

    private String actionLabel(ActivityLog.Action action) {
        if (action == null) {
            return "a mis a jour";
        }
        return switch (action) {
            case TASK_CREATED -> "a cree";
            case TASK_UPDATED -> "a modifie";
            case TASK_MOVED -> "a deplace";
            case TASK_ASSIGNED -> "a assigne";
            case TASK_DELETED -> "a supprime";
            case TASK_COMPLETED -> "a termine";
            default -> "a mis a jour";
        };
    }

    private String fieldLabel(ActivityLog log) {
        if (log.getAction() == null) {
            return "element";
        }
        return switch (log.getAction()) {
            case TASK_MOVED -> "statut";
            case TASK_ASSIGNED -> "assigne";
            case TASK_COMPLETED -> "tache";
            default -> "tache";
        };
    }

    private String capitalize(String value) {
        if (value == null || value.isBlank()) {
            return "";
        }
        return value.substring(0, 1).toUpperCase(Locale.ROOT) + value.substring(1);
    }

    private String safe(String value) {
        return value != null ? value : "";
    }

    private String name(Enum<?> value) {
        return value != null ? value.name() : null;
    }
}
