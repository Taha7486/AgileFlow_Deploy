package com.agileflow.dto.summary;

public record ProjectDetailDto(
        Long id,
        String nom,
        String issuePrefix,
        String statut
) {
}
