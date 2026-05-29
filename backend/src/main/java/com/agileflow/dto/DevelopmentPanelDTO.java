package com.agileflow.dto;

import java.util.List;

public record DevelopmentPanelDTO(
        Long taskId,
        String issuePrefix,
        String taskTitre,
        String taskStatut,
        List<BranchDTO> branches,
        List<GitHubPullRequestDTO> pullRequests,
        List<GitHubCommitDTO> commits
) {
}
