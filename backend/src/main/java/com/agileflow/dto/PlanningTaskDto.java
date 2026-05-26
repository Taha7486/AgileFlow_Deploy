package com.agileflow.dto;

import java.util.List;

public record PlanningTaskDto(
        Long id,
        String titre,
        String description,
        String type,
        String statut,
        String priorite,
        Boolean isUrgent,
        String dateEcheance,
        String dateCreation,
        String dateMiseAJour,
        List<String> labels,
        UserSummaryDto assignee,
        UserSummaryDto reporter,
        SprintSummaryDto sprint,
        StorySummaryDto userStory,
        ProjectSummaryDto project,
        int commentCount,
        int subtaskCount,
        String updatedAgo,
        String typeTache,
        Long parentTaskId,
        String parentTaskTitre,
        List<PlanningTaskDto> sousTaskes,
        int sousTaskeCount,
        int sousTaskesDoneCount
) {
}
