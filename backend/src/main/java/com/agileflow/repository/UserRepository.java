package com.agileflow.repository;

import com.agileflow.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByEmail(String email);
    boolean existsByEmail(String email);
    long countByActifTrue();
    List<User> findByActifTrueOrderByDateCreationDesc();

    @Query("""
            SELECT u.id,
                   CONCAT(CONCAT(COALESCE(u.prenom, ''), ' '), COALESCE(u.nom, '')),
                   u.email,
                   u.role
            FROM User u
            WHERE u.actif = true
            ORDER BY u.dateCreation DESC, u.id DESC
            """)
    List<Object[]> findActiveUsersForAnalytics();

    @Query("""
            SELECT DISTINCT u.id,
                   CONCAT(CONCAT(COALESCE(u.prenom, ''), ' '), COALESCE(u.nom, '')),
                   u.email,
                   u.role
            FROM User u
            WHERE u.actif = true
              AND (
                u.id = (
                    SELECT p.manager.id
                    FROM Project p
                    WHERE p.id = :projectId
                )
                OR EXISTS (
                    SELECT 1
                    FROM ProjectMember pm
                    WHERE pm.project.id = :projectId
                      AND pm.user.id = u.id
                )
              )
            ORDER BY u.id DESC
            """)
    List<Object[]> findActiveParticipantsForAnalytics(@Param("projectId") Long projectId);

    @Query("""
            SELECT COUNT(DISTINCT u.id)
            FROM User u
            WHERE u.actif = true
              AND (
                u.id = (
                    SELECT p.manager.id
                    FROM Project p
                    WHERE p.id = :projectId
                )
                OR EXISTS (
                    SELECT 1
                    FROM ProjectMember pm
                    WHERE pm.project.id = :projectId
                      AND pm.user.id = u.id
                )
              )
            """)
    long countActiveParticipantsByProjectId(@Param("projectId") Long projectId);

    @Query("""
            SELECT u FROM User u
            WHERE :q IS NULL
               OR LOWER(CONCAT(COALESCE(u.prenom,''), ' ', COALESCE(u.nom,''))) LIKE LOWER(CONCAT('%', :q, '%'))
               OR LOWER(u.email) LIKE LOWER(CONCAT('%', :q, '%'))
            ORDER BY u.dateCreation DESC
            """)
    List<User> search(@Param("q") String q);
}
