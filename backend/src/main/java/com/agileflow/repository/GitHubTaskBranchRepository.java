package com.agileflow.repository;

import com.agileflow.entity.GitHubTaskBranch;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.Collection;

public interface GitHubTaskBranchRepository extends JpaRepository<GitHubTaskBranch, Long> {
    List<GitHubTaskBranch> findByTask_Id(Long taskId);

    void deleteByTask_IdIn(Collection<Long> taskIds);

    Optional<GitHubTaskBranch> findByTask_IdAndBranchName(Long taskId, String branchName);

    boolean existsByTask_IdAndBranchName(Long taskId, String branchName);

    @Query("""
            SELECT DISTINCT b
            FROM GitHubTaskBranch b
            JOIN b.task t
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
    List<GitHubTaskBranch> findByTaskProjectId(@Param("projectId") Long projectId);
}
