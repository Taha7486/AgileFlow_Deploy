package com.agileflow.dto;

public record PlanningStatsDto(
        long total,
        long todo,
        long inProgress,
        long review,
        long done,
        long urgent,
        long overdue
) {
}
