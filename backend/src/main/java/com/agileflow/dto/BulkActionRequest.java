package com.agileflow.dto;

import java.util.List;

public record BulkActionRequest(
        String action,
        List<Long> taskIds,
        String value,
        Long assigneeId
) {
}
