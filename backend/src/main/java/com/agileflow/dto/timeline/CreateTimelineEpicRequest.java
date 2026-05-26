package com.agileflow.dto.timeline;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record CreateTimelineEpicRequest(
        @NotBlank String titre,
        String description,
        @NotNull Long projectId,
        String dateDebut,
        String dateFin,
        String couleur,
        Long assigneeId
) {
}
