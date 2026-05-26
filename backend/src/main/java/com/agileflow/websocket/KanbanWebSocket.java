package com.agileflow.websocket;

import com.agileflow.dto.KanbanMoveRequest;
import com.agileflow.service.KanbanService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.stereotype.Controller;

@Controller
@RequiredArgsConstructor
@Slf4j
public class KanbanWebSocket {

    private final KanbanService kanbanService;

    @MessageMapping("/kanban")
    public void handleKanbanMove(@Payload KanbanMoveRequest payload) {
        try {
            kanbanService.moveTask(payload.taskId(), payload.newStatut(), payload.projectId());
        } catch (Exception e) {
            log.error("Erreur deplacement Kanban WS: {}", e.getMessage());
        }
    }

    @MessageMapping("/kanban/move")
    public void handleLegacyTaskMove(@Payload KanbanMoveRequest payload) {
        handleKanbanMove(payload);
    }
}
