package com.agileflow.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record QuickCreateTaskRequest(
        @NotBlank String titre,
        String description,
        String statut,
        @NotNull Long projectId,
        Long sprintId,
        String typeTache,
        String priorite,
        Long assigneeId
) {
}
