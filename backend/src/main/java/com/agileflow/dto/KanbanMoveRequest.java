package com.agileflow.dto;

public record KanbanMoveRequest(
        Long taskId,
        String newStatut,
        Long projectId
) {
}
