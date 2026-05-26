package com.agileflow.dto.timeline;

import com.agileflow.dto.ProjectSummaryDto;

import java.util.List;

public record TimelineDto(
        ProjectSummaryDto project,
        List<TimelineEpicDto> epics,
        List<TimelineTaskDto> tasksWithoutEpic,
        TimelinePeriodeDto periode,
        TimelineStatsDto stats
) {
}
