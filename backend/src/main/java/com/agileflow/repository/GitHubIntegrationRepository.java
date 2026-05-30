package com.agileflow.repository;

import com.agileflow.entity.GitHubIntegration;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface GitHubIntegrationRepository extends JpaRepository<GitHubIntegration, Long> {
    Optional<GitHubIntegration> findByProject_Id(Long projectId);
    boolean existsByProject_Id(Long projectId);
    void deleteByProject_Id(Long projectId);
}
