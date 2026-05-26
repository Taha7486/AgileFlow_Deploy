package com.agileflow.dto.summary;

public record StatusSegmentDto(
        String statut,
        String labelFR,
        long count,
        double pourcentage,
        String couleur
) {
}
