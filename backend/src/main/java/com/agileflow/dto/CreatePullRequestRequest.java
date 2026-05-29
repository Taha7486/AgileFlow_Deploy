package com.agileflow.dto;

public record CreatePullRequestRequest(
        String title,
        String body,
        String headBranch,
        String baseBranch
) {
}
