package com.agileflow.dto;

import com.agileflow.entity.Project;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;

public record UpdateProjectRequest(
        @NotBlank String name,
        String issuePrefix,
        String description,
        @NotNull LocalDate startDate,
        LocalDate endDate,
        @NotNull Project.Statut status,
        Long teamId
) {}
