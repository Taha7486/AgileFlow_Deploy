package com.agileflow.dto;

import java.time.LocalDateTime;

public record NotificationDTO(
        Long id,
        String message,
        String targetUrl,
        boolean lu,
        LocalDateTime dateCreation
) {}
