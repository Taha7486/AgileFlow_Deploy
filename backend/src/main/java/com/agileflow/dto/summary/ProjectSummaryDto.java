package com.agileflow.dto.summary;

import java.util.List;

public record ProjectSummaryDto(
        ProjectDetailDto project,
        KpiStatsDto kpi,
        StatusOverviewDto statusOverview,
        PriorityBreakdownDto priorityBreakdown,
        TypesOfWorkDto typesOfWork,
        List<WorkloadDto> teamWorkload,
        List<EpicProgressDto> epicProgress,
        List<ActivityGroupDto> recentActivity
) {
}
