package com.agileflow.dto;

import java.time.LocalDateTime;

public record BranchDTO(
        String name,
        String sha,
        Long taskId,
        LocalDateTime createdAt
) {
}
