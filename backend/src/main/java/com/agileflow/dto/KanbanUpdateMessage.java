package com.agileflow.dto;

public record KanbanUpdateMessage(
        String type,
        KanbanTaskDto task,
        String fromStatut,
        String toStatut
) {
}
