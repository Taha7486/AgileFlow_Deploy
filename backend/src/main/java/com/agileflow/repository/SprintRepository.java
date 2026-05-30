package com.agileflow.repository;

import com.agileflow.entity.Sprint;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface SprintRepository extends JpaRepository<Sprint, Long> {
    List<Sprint> findByProjectId(Long projectId);

    void deleteByProject_Id(Long projectId);

    Optional<Sprint> findFirstByProjectIdAndStatut(Long projectId, Sprint.Statut statut);

    long countByStatut(Sprint.Statut statut);

    long countByProject_Manager_IdAndStatut(Long managerId, Sprint.Statut statut);
}
