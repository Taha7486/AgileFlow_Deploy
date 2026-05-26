package com.agileflow.dto.summary;

public record KpiStatsDto(
        long completed,
        long updated,
        long created,
        long dueSoon,
        int periodeDays
) {
}
