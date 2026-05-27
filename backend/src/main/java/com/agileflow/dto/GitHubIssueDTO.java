package com.agileflow.dto;

import java.time.LocalDateTime;
import java.util.List;

public record GitHubIssueDTO(
        int number,
        String title,
        String body,
        String state,
        String htmlUrl,
        String assigneeLogin,
        List<String> labels,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
}
