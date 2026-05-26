package com.agileflow.dto.summary;

public record PriorityBreakdownDto(
        long highest,
        long high,
        long medium,
        long low,
        long lowest
) {
}
