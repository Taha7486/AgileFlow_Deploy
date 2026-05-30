package com.agileflow.dto.summary;

public record ActivityItemDto(
        Long userId,
        String userName,
        String userInitiales,
        String userAvatarColor,
        String userAvatarUrl,
        String action,
        String fieldName,
        String preposition,
        Long taskId,
        String taskTitre,
        String taskStatut,
        String taskTypeTache,
        String dateRelative,
        String dateISO
) {
}
