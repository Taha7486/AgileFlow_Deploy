package com.agileflow.dto;

import java.time.LocalDateTime;

public record GitHubIntegrationDTO(
        Long id,
        Long projectId,
        String repoOwner,
        String repoName,
        boolean syncIssues,
        boolean syncPrs,
        boolean syncCommits,
        LocalDateTime lastSyncedAt,
        boolean active
) {
}
