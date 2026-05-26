package com.agileflow.dto.summary;

public record TypesOfWorkDto(
        long story,
        long epic,
        long task,
        long feature,
        long bug,
        long subtask,
        long total
) {
}
