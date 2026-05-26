package com.agileflow.repository;

import com.agileflow.entity.SavedView;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface SavedViewRepository extends JpaRepository<SavedView, Long> {
    List<SavedView> findByOwner_IdOrderByDateCreationDesc(Long ownerId);
    Optional<SavedView> findByIdAndOwner_Id(Long id, Long ownerId);
}
