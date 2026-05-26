package com.agileflow.dto;

import java.util.List;

public record PlanningGroupDto(
        String groupKey,
        String groupLabel,
        String groupType,
        List<PlanningTaskDto> tasks,
        int taskCount,
        int doneCount
) {
}
