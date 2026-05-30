package com.agileflow.repository;

import com.agileflow.entity.ActivityLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;

public interface ActivityLogRepository extends JpaRepository<ActivityLog, Long> {

    void deleteByProject_Id(Long projectId);

    void deleteByTask_IdIn(Collection<Long> taskIds);

    Page<ActivityLog> findAllByOrderByCreatedAtDesc(Pageable pageable);

    @Query(
            value = """
            SELECT log FROM ActivityLog log
            JOIN FETCH log.actor actor
            LEFT JOIN FETCH log.project project
            LEFT JOIN FETCH log.task task
            WHERE project.id = :projectId
            ORDER BY log.createdAt DESC
            """,
            countQuery = """
            SELECT COUNT(log.id) FROM ActivityLog log
            LEFT JOIN log.project project
            WHERE project.id = :projectId
            """
    )
    Page<ActivityLog> findByProjectIdOrderByCreatedAtDesc(@Param("projectId") Long projectId, Pageable pageable);

    @Query(
            value = """
            SELECT log FROM ActivityLog log
            JOIN FETCH log.actor actor
            LEFT JOIN FETCH log.project project
            LEFT JOIN FETCH log.sprint sprint
            LEFT JOIN FETCH log.task task
            WHERE (:q IS NULL
                OR LOWER(log.message) LIKE LOWER(CONCAT('%', :q, '%'))
                OR LOWER(actor.email) LIKE LOWER(CONCAT('%', :q, '%'))
                OR LOWER(CONCAT(COALESCE(actor.prenom, ''), ' ', COALESCE(actor.nom, ''))) LIKE LOWER(CONCAT('%', :q, '%'))
                OR LOWER(project.nom) LIKE LOWER(CONCAT('%', :q, '%'))
                OR LOWER(task.titre) LIKE LOWER(CONCAT('%', :q, '%')))
              AND (:projectId IS NULL OR project.id = :projectId)
              AND (:actorId IS NULL OR actor.id = :actorId)
              AND (:action IS NULL OR log.action = :action)
              AND (:startDate IS NULL OR log.activityDate >= :startDate)
              AND (:endDate IS NULL OR log.activityDate <= :endDate)
            """,
            countQuery = """
            SELECT COUNT(log.id) FROM ActivityLog log
            JOIN log.actor actor
            LEFT JOIN log.project project
            LEFT JOIN log.task task
            WHERE (:q IS NULL
                OR LOWER(log.message) LIKE LOWER(CONCAT('%', :q, '%'))
                OR LOWER(actor.email) LIKE LOWER(CONCAT('%', :q, '%'))
                OR LOWER(CONCAT(COALESCE(actor.prenom, ''), ' ', COALESCE(actor.nom, ''))) LIKE LOWER(CONCAT('%', :q, '%'))
                OR LOWER(project.nom) LIKE LOWER(CONCAT('%', :q, '%'))
                OR LOWER(task.titre) LIKE LOWER(CONCAT('%', :q, '%')))
              AND (:projectId IS NULL OR project.id = :projectId)
              AND (:actorId IS NULL OR actor.id = :actorId)
              AND (:action IS NULL OR log.action = :action)
              AND (:startDate IS NULL OR log.activityDate >= :startDate)
              AND (:endDate IS NULL OR log.activityDate <= :endDate)
            """
    )
    Page<ActivityLog> searchLogs(
            @Param("q") String q,
            @Param("projectId") Long projectId,
            @Param("actorId") Long actorId,
            @Param("action") ActivityLog.Action action,
            @Param("startDate") LocalDate startDate,
            @Param("endDate") LocalDate endDate,
            Pageable pageable
    );

    @Query("""
            SELECT COUNT(log.id)
            FROM ActivityLog log
            LEFT JOIN log.project project
            LEFT JOIN project.manager manager
            LEFT JOIN log.sprint sprint
            WHERE log.createdAt >= :startDateAtStart
              AND log.createdAt < :endDateExclusive
              AND (:projectId IS NULL OR project.id = :projectId)
              AND (:sprintId IS NULL OR sprint.id = :sprintId)
              AND (:managerId IS NULL OR manager.id = :managerId)
              AND (:actorId IS NULL OR log.actor.id = :actorId)
            """)
    long countForScope(
            @Param("startDateAtStart") LocalDateTime startDateAtStart,
            @Param("endDateExclusive") LocalDateTime endDateExclusive,
            @Param("projectId") Long projectId,
            @Param("sprintId") Long sprintId,
            @Param("managerId") Long managerId,
            @Param("actorId") Long actorId
    );

    @Query("""
            SELECT COUNT(DISTINCT log.actor.id)
            FROM ActivityLog log
            LEFT JOIN log.project project
            LEFT JOIN project.manager manager
            LEFT JOIN log.sprint sprint
            WHERE log.createdAt >= :startDateAtStart
              AND log.createdAt < :endDateExclusive
              AND (:projectId IS NULL OR project.id = :projectId)
              AND (:sprintId IS NULL OR sprint.id = :sprintId)
              AND (:managerId IS NULL OR manager.id = :managerId)
              AND (:actorId IS NULL OR log.actor.id = :actorId)
            """)
    long countActiveMembersForScope(
            @Param("startDateAtStart") LocalDateTime startDateAtStart,
            @Param("endDateExclusive") LocalDateTime endDateExclusive,
            @Param("projectId") Long projectId,
            @Param("sprintId") Long sprintId,
            @Param("managerId") Long managerId,
            @Param("actorId") Long actorId
    );

    @Query("""
            SELECT actor.id,
                   CONCAT(CONCAT(COALESCE(actor.prenom, ''), ' '), COALESCE(actor.nom, '')),
                   actor.email,
                   actor.role,
                   COUNT(log.id),
                   SUM(CASE WHEN log.action = com.agileflow.entity.ActivityLog.Action.TASK_COMPLETED THEN 1 ELSE 0 END)
            FROM ActivityLog log
            JOIN log.actor actor
            LEFT JOIN log.project project
            LEFT JOIN project.manager manager
            LEFT JOIN log.sprint sprint
            WHERE log.createdAt >= :startDateAtStart
              AND log.createdAt < :endDateExclusive
              AND (:projectId IS NULL OR project.id = :projectId)
              AND (:sprintId IS NULL OR sprint.id = :sprintId)
              AND (:managerId IS NULL OR manager.id = :managerId)
              AND (:actorId IS NULL OR actor.id = :actorId)
            GROUP BY actor.id, actor.prenom, actor.nom, actor.email, actor.role
            ORDER BY COUNT(log.id) DESC, actor.id ASC
            """)
    List<Object[]> aggregateByMember(
            @Param("startDateAtStart") LocalDateTime startDateAtStart,
            @Param("endDateExclusive") LocalDateTime endDateExclusive,
            @Param("projectId") Long projectId,
            @Param("sprintId") Long sprintId,
            @Param("managerId") Long managerId,
            @Param("actorId") Long actorId
    );

    @Query("""
            SELECT CAST(log.createdAt AS java.time.LocalDate), COUNT(log.id)
            FROM ActivityLog log
            LEFT JOIN log.project project
            LEFT JOIN project.manager manager
            LEFT JOIN log.sprint sprint
            WHERE log.createdAt >= :startDateAtStart
              AND log.createdAt < :endDateExclusive
              AND (:projectId IS NULL OR project.id = :projectId)
              AND (:sprintId IS NULL OR sprint.id = :sprintId)
              AND (:managerId IS NULL OR manager.id = :managerId)
              AND (:actorId IS NULL OR log.actor.id = :actorId)
            GROUP BY CAST(log.createdAt AS java.time.LocalDate)
            ORDER BY CAST(log.createdAt AS java.time.LocalDate) ASC
            """)
    List<Object[]> aggregateByDate(
            @Param("startDateAtStart") LocalDateTime startDateAtStart,
            @Param("endDateExclusive") LocalDateTime endDateExclusive,
            @Param("projectId") Long projectId,
            @Param("sprintId") Long sprintId,
            @Param("managerId") Long managerId,
            @Param("actorId") Long actorId
    );

    @Query("""
            SELECT CAST(log.createdAt AS java.time.LocalDate),
                   COUNT(log.id),
                   SUM(CASE WHEN log.action = com.agileflow.entity.ActivityLog.Action.TASK_COMPLETED THEN 1 ELSE 0 END)
            FROM ActivityLog log
            LEFT JOIN log.project project
            LEFT JOIN project.manager manager
            LEFT JOIN log.sprint sprint
            WHERE log.createdAt >= :startDateAtStart
              AND log.createdAt < :endDateExclusive
              AND (:projectId IS NULL OR project.id = :projectId)
              AND (:sprintId IS NULL OR sprint.id = :sprintId)
              AND (:managerId IS NULL OR manager.id = :managerId)
              AND (:actorId IS NULL OR log.actor.id = :actorId)
            GROUP BY CAST(log.createdAt AS java.time.LocalDate)
            ORDER BY CAST(log.createdAt AS java.time.LocalDate) ASC
            """)
    List<Object[]> aggregateTrendByDate(
            @Param("startDateAtStart") LocalDateTime startDateAtStart,
            @Param("endDateExclusive") LocalDateTime endDateExclusive,
            @Param("projectId") Long projectId,
            @Param("sprintId") Long sprintId,
            @Param("managerId") Long managerId,
            @Param("actorId") Long actorId
    );
}
