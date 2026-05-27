package com.agileflow.dto;

import java.time.LocalDateTime;

public record GitHubPullRequestDTO(
        int number,
        String title,
        String state,
        String htmlUrl,
        String url,
        String headBranch,
        String baseBranch,
        String authorLogin,
        String authorAvatarUrl,
        boolean merged,
        LocalDateTime createdAt,
        LocalDateTime updatedAt,
        LocalDateTime mergedAt,
        int additions,
        int deletions,
        int changedFiles,
        String checksStatus,
        Long linkedTaskId
) {
}
