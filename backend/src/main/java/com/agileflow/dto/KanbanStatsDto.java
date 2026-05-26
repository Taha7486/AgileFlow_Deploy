package com.agileflow.dto;

public record KanbanStatsDto(
        long total,
        long todo,
        long inProgress,
        long review,
        long done,
        long urgent,
        long overdue
) {
}
