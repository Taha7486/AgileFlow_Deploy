package com.agileflow.dto.timeline;

public record TimelineStatsDto(
        long total,
        long avecDates,
        long sansDates,
        long todo,
        long inProgress,
        long review,
        long done
) {
}
