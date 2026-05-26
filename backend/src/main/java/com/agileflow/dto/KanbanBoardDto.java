package com.agileflow.dto;

import java.util.List;

public record KanbanBoardDto(
        ProjectSummaryDto project,
        SprintSummaryDto sprint,
        List<KanbanColumnDto> columns,
        KanbanStatsDto stats
) {
}
