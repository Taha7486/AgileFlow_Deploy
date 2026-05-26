package com.agileflow.dto.timeline;

import com.agileflow.dto.SprintSummaryDto;
import com.agileflow.dto.StorySummaryDto;
import com.agileflow.dto.UserSummaryDto;

import java.util.List;

public record TimelineTaskDto(
        Long id,
        String titre,
        String statut,
        String priorite,
        String typeTache,
        String dateDebut,
        String dateFin,
        Boolean isUrgent,
        List<String> labels,
        UserSummaryDto assignee,
        SprintSummaryDto sprint,
        StorySummaryDto userStory,
        Long parentEpicId,
        int commentCount,
        boolean aDesDatesDefinies
) {
}
