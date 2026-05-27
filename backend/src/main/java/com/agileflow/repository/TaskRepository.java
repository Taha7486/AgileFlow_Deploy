package com.agileflow.repository;

import com.agileflow.entity.Task;
import com.agileflow.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface TaskRepository extends JpaRepository<Task, Long>, JpaSpecificationExecutor<Task> {
    List<Task> findByAssignedToId(Long userId);
    List<Task> findBySprintId(Long sprintId);
    List<Task> findByParentTask_Id(Long parentTaskId);

    Optional<Task> findByProject_IdAndGithubIssueNumber(Long projectId, Integer githubIssueNumber);

    Optional<Task> findByGithubIssueNumber(Integer githubIssueNumber);

    Optional<Task> findByGithubPrNumber(Integer githubPrNumber);

    long countByStatut(Task.Statut statut);

    long countByAssignedTo_Id(Long userId);

    long countByAssignedTo_IdAndStatut(Long userId, Task.Statut statut);

    long countBySprint_Project_Manager_Id(Long managerId);

    long countBySprint_Project_Manager_IdAndStatut(Long managerId, Task.Statut statut);

    List<Task> findBySprint_Project_Id(Long projectId);

    @Query("""
            SELECT DISTINCT t
            FROM Task t
            LEFT JOIN t.project directProject
            LEFT JOIN t.sprint s
            LEFT JOIN s.project sprintProject
            LEFT JOIN t.story story
            LEFT JOIN story.backlog backlog
            LEFT JOIN backlog.project storyProject
            WHERE directProject.id = :projectId
               OR sprintProject.id = :projectId
               OR storyProject.id = :projectId
            """)
    List<Task> findByAnyProjectId(@Param("projectId") Long projectId);

    long countByStory_Id(Long storyId);

    long countByStory_IdAndStatut(Long storyId, Task.Statut statut);

    List<Task> findByStory_Id(Long storyId);

    @Query("""
            SELECT DISTINCT t
            FROM Task t
            LEFT JOIN FETCH t.assignedTo assigned
            LEFT JOIN FETCH t.sprint s
            LEFT JOIN FETCH s.project p
            LEFT JOIN FETCH t.story story
            LEFT JOIN FETCH story.backlog backlog
            LEFT JOIN FETCH backlog.project backlogProject
            WHERE t.dateEcheance IS NOT NULL
              AND t.isUrgent = false
              AND t.statut <> com.agileflow.entity.Task.Statut.DONE
              AND t.dateEcheance BETWEEN :windowStart AND :windowEnd
            """)
    List<Task> findTasksBecomingUrgent(
            @Param("windowStart") LocalDateTime windowStart,
            @Param("windowEnd") LocalDateTime windowEnd
    );

    @Query("""
            SELECT DISTINCT t
            FROM Task t
            LEFT JOIN FETCH t.assignedTo assigned
            LEFT JOIN FETCH t.sprint s
            LEFT JOIN FETCH s.project p
            LEFT JOIN FETCH t.story story
            LEFT JOIN FETCH story.backlog backlog
            LEFT JOIN FETCH backlog.project backlogProject
            WHERE t.dateEcheance IS NOT NULL
              AND t.deadline24hReminderSent = false
              AND t.statut <> com.agileflow.entity.Task.Statut.DONE
              AND assigned IS NOT NULL
              AND t.dateEcheance >= :now
              AND t.dateEcheance <= :deadlineThreshold
            """)
    List<Task> findTasksFor24hReminder(
            @Param("now") LocalDateTime now,
            @Param("deadlineThreshold") LocalDateTime deadlineThreshold
    );

    @Query("""
            SELECT DISTINCT t
            FROM Task t
            LEFT JOIN FETCH t.assignedTo assigned
            LEFT JOIN FETCH t.sprint s
            LEFT JOIN FETCH s.project p
            LEFT JOIN FETCH t.story story
            LEFT JOIN FETCH story.backlog backlog
            LEFT JOIN FETCH backlog.project backlogProject
            WHERE t.dateEcheance IS NOT NULL
              AND t.deadline1hReminderSent = false
              AND t.statut <> com.agileflow.entity.Task.Statut.DONE
              AND assigned IS NOT NULL
              AND t.dateEcheance >= :now
              AND t.dateEcheance <= :deadlineThreshold
            """)
    List<Task> findTasksFor1hReminder(
            @Param("now") LocalDateTime now,
            @Param("deadlineThreshold") LocalDateTime deadlineThreshold
    );

    @Query("""
            SELECT DISTINCT assigned
            FROM Task t
            JOIN t.sprint s
            JOIN s.project p
            JOIN t.assignedTo assigned
            WHERE p.id = :projectId
            """)
    List<User> findDistinctAssigneesByProjectId(@Param("projectId") Long projectId);

    @Query("""
            SELECT COUNT(t.id)
            FROM Task t
            LEFT JOIN t.sprint s
            LEFT JOIN s.project p
            WHERE (:projectId IS NULL OR p.id = :projectId)
              AND (:sprintId IS NULL OR s.id = :sprintId)
              AND (:managerId IS NULL OR p.manager.id = :managerId)
              AND (:actorId IS NULL OR t.assignedTo.id = :actorId)
              AND (:statut IS NULL OR t.statut = :statut)
            """)
    long countForStats(
            @Param("projectId") Long projectId,
            @Param("sprintId") Long sprintId,
            @Param("managerId") Long managerId,
            @Param("actorId") Long actorId,
            @Param("statut") Task.Statut statut
    );

    @Query("""
            SELECT CAST(t.dateEcheance AS java.time.LocalDate), COUNT(t.id)
            FROM Task t
            LEFT JOIN t.sprint s
            LEFT JOIN s.project p
            WHERE t.statut = com.agileflow.entity.Task.Statut.DONE
              AND t.dateEcheance IS NOT NULL
              AND t.dateEcheance >= :startDateAtStart
              AND t.dateEcheance < :endDateExclusive
              AND (:projectId IS NULL OR p.id = :projectId)
              AND (:sprintId IS NULL OR s.id = :sprintId)
              AND (:managerId IS NULL OR p.manager.id = :managerId)
              AND (:actorId IS NULL OR t.assignedTo.id = :actorId)
            GROUP BY CAST(t.dateEcheance AS java.time.LocalDate)
            ORDER BY CAST(t.dateEcheance AS java.time.LocalDate) ASC
            """)
    List<Object[]> aggregateCompletedTasksByDueDate(
            @Param("startDateAtStart") LocalDateTime startDateAtStart,
            @Param("endDateExclusive") LocalDateTime endDateExclusive,
            @Param("projectId") Long projectId,
            @Param("sprintId") Long sprintId,
            @Param("managerId") Long managerId,
            @Param("actorId") Long actorId
    );

    @Query("""
            SELECT COUNT(t.id)
            FROM Task t
            LEFT JOIN t.project directProject
            LEFT JOIN t.sprint s
            LEFT JOIN s.project sprintProject
            LEFT JOIN t.story story
            LEFT JOIN story.backlog backlog
            LEFT JOIN backlog.project storyProject
            LEFT JOIN t.assignedTo assignee
            WHERE t.statut = com.agileflow.entity.Task.Statut.DONE
              AND t.dateMiseAJour >= :startDateAtStart
              AND t.dateMiseAJour < :endDateExclusive
              AND (:sprintId IS NULL OR s.id = :sprintId)
              AND (:managerId IS NULL OR directProject.manager.id = :managerId OR sprintProject.manager.id = :managerId OR storyProject.manager.id = :managerId)
              AND (:actorId IS NULL OR assignee.id = :actorId)
            """)
    long countCompletedForAnalytics(
            @Param("startDateAtStart") LocalDateTime startDateAtStart,
            @Param("endDateExclusive") LocalDateTime endDateExclusive,
            @Param("sprintId") Long sprintId,
            @Param("managerId") Long managerId,
            @Param("actorId") Long actorId
    );

    @Query("""
            SELECT CAST(t.dateMiseAJour AS java.time.LocalDate), COUNT(t.id)
            FROM Task t
            LEFT JOIN t.project directProject
            LEFT JOIN t.sprint s
            LEFT JOIN s.project sprintProject
            LEFT JOIN t.story story
            LEFT JOIN story.backlog backlog
            LEFT JOIN backlog.project storyProject
            LEFT JOIN t.assignedTo assignee
            WHERE t.statut = com.agileflow.entity.Task.Statut.DONE
              AND t.dateMiseAJour >= :startDateAtStart
              AND t.dateMiseAJour < :endDateExclusive
              AND (:sprintId IS NULL OR s.id = :sprintId)
              AND (:managerId IS NULL OR directProject.manager.id = :managerId OR sprintProject.manager.id = :managerId OR storyProject.manager.id = :managerId)
              AND (:actorId IS NULL OR assignee.id = :actorId)
            GROUP BY CAST(t.dateMiseAJour AS java.time.LocalDate)
            ORDER BY CAST(t.dateMiseAJour AS java.time.LocalDate) ASC
            """)
    List<Object[]> aggregateCompletedForAnalyticsByDate(
            @Param("startDateAtStart") LocalDateTime startDateAtStart,
            @Param("endDateExclusive") LocalDateTime endDateExclusive,
            @Param("sprintId") Long sprintId,
            @Param("managerId") Long managerId,
            @Param("actorId") Long actorId
    );

    @Query("""
            SELECT assignee.id,
                   CONCAT(CONCAT(COALESCE(assignee.prenom, ''), ' '), COALESCE(assignee.nom, '')),
                   assignee.email,
                   assignee.role,
                   COUNT(t.id)
            FROM Task t
            JOIN t.assignedTo assignee
            LEFT JOIN t.project directProject
            LEFT JOIN t.sprint s
            LEFT JOIN s.project sprintProject
            LEFT JOIN t.story story
            LEFT JOIN story.backlog backlog
            LEFT JOIN backlog.project storyProject
            WHERE t.statut = com.agileflow.entity.Task.Statut.DONE
              AND t.dateMiseAJour >= :startDateAtStart
              AND t.dateMiseAJour < :endDateExclusive
              AND (:sprintId IS NULL OR s.id = :sprintId)
              AND (:managerId IS NULL OR directProject.manager.id = :managerId OR sprintProject.manager.id = :managerId OR storyProject.manager.id = :managerId)
              AND (:actorId IS NULL OR assignee.id = :actorId)
            GROUP BY assignee.id, assignee.prenom, assignee.nom, assignee.email, assignee.role
            ORDER BY COUNT(t.id) DESC, assignee.id ASC
            """)
    List<Object[]> aggregateCompletedForAnalyticsByMember(
            @Param("startDateAtStart") LocalDateTime startDateAtStart,
            @Param("endDateExclusive") LocalDateTime endDateExclusive,
            @Param("sprintId") Long sprintId,
            @Param("managerId") Long managerId,
            @Param("actorId") Long actorId
    );

    @Query("""
            SELECT s.id,
                   s.nom,
                   COUNT(t.id),
                   SUM(CASE WHEN t.statut = com.agileflow.entity.Task.Statut.DONE THEN 1 ELSE 0 END),
                   SUM(CASE WHEN t.statut = com.agileflow.entity.Task.Statut.DONE THEN COALESCE(story.storyPoints, 0) ELSE 0 END),
                   COALESCE(s.capacitePoints, 0)
            FROM Task t
            JOIN t.sprint s
            LEFT JOIN t.story story
            LEFT JOIN s.project p
            WHERE (:projectId IS NULL OR p.id = :projectId)
              AND (:sprintId IS NULL OR s.id = :sprintId)
              AND (:managerId IS NULL OR p.manager.id = :managerId)
              AND (:actorId IS NULL OR t.assignedTo.id = :actorId)
            GROUP BY s.id, s.nom, s.capacitePoints
            ORDER BY s.dateDebut ASC, s.id ASC
            """)
    List<Object[]> aggregateVelocityBySprint(
            @Param("projectId") Long projectId,
            @Param("sprintId") Long sprintId,
            @Param("managerId") Long managerId,
            @Param("actorId") Long actorId
    );
}
