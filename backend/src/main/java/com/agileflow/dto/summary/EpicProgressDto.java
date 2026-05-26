package com.agileflow.dto.summary;

public record EpicProgressDto(
        Long epicId,
        String titre,
        String statut,
        String couleur,
        long tachesTotal,
        long tachesDone,
        double pourcentage
) {
}
