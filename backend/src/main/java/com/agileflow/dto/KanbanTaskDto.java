package com.agileflow.dto;

import java.util.List;

public record KanbanTaskDto(
        Long id,
        String titre,
        String description,
        String statut,
        String priorite,
        Boolean isUrgent,
        String dateEcheance,
        List<String> labels,
        UserSummaryDto assignee,
        UserSummaryDto reporter,
        SprintSummaryDto sprint,
        StorySummaryDto userStory,
        ProjectSummaryDto project,
        int commentCount,
        int sousTaskeCount,
        int sousTaskesDoneCount,
        String typeTache,
        Long parentTaskId,
        String parentTaskTitre,
        String epicTitre,
        String dateCreation,
        String dateMiseAJour,
        String updatedAgo
) {
}
