package com.agileflow.dto;

import java.util.List;

public record BulkActionResponse(
        int success,
        int failed,
        List<String> errors
) {
}
