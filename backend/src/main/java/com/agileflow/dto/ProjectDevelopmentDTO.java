package com.agileflow.dto;

import java.util.List;

public record ProjectDevelopmentDTO(
        Long projectId,
        String issuePrefix,
        String repoFullName,
        boolean connected,
        List<GitHubPullRequestDTO> openPullRequests,
        List<GitHubPullRequestDTO> mergedPullRequests,
        List<BranchDTO> activeBranches,
        List<GitHubCommitDTO> recentCommits,
        int totalOpenPRs,
        int totalMergedPRs,
        int totalBranches,
        int failingChecks,
        int page,
        int size,
        int totalPages
) {
}
