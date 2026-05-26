package com.agileflow.dto.timeline;

import com.agileflow.dto.UserSummaryDto;

import java.util.List;

public record TimelineEpicDto(
        Long id,
        String titre,
        String statut,
        String priorite,
        String dateDebut,
        String dateFin,
        String couleur,
        UserSummaryDto assignee,
        List<TimelineTaskDto> taches,
        int tacheCount,
        int tachesDoneCount,
        boolean estExpanded
) {
}
