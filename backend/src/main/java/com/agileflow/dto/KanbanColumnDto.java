package com.agileflow.dto;

import java.util.List;

public record KanbanColumnDto(
        String statut,
        String labelFR,
        int count,
        List<KanbanTaskDto> tasks
) {
}
