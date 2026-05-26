package com.agileflow.dto;

import java.util.List;

public record PlanningPageResponse(
        List<PlanningGroupDto> groups,
        long totalElements,
        int totalPages,
        int currentPage,
        PlanningStatsDto stats
) {
}
