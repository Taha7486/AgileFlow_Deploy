package com.agileflow.dto;

import java.time.LocalDateTime;
import java.util.List;

public record GitHubCommitDTO(
        String sha,
        String shortSha,
        String message,
        String authorLogin,
        String authorAvatarUrl,
        String htmlUrl,
        String url,
        LocalDateTime committedAt,
        List<Long> mentionedTaskIds,
        Long linkedTaskId
) {
}
