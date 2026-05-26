package com.agileflow.dto.summary;

import java.util.List;

public record ActivityGroupDto(
        String dateLabel,
        String dateISO,
        List<ActivityItemDto> items
) {
}
