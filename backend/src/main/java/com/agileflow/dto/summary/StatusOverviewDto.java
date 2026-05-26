package com.agileflow.dto.summary;

import java.util.List;

public record StatusOverviewDto(
        long total,
        long todo,
        long inProgress,
        long review,
        long done,
        List<StatusSegmentDto> segments
) {
}
