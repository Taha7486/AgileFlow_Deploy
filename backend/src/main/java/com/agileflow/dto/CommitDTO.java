package com.agileflow.dto;

import java.time.LocalDateTime;

public record CommitDTO(
        String sha,
        String shortSha,
        String message,
        String authorLogin,
        String authorAvatarUrl,
        String url,
        LocalDateTime committedAt,
        Long linkedTaskId
) {
}
