package com.agileflow.dto.summary;

public record WorkloadDto(
        Long userId,
        String nom,
        String prenom,
        String initiales,
        String avatarColor,
        String avatarUrl,
        long tachesAssignees,
        double pourcentage
) {
}
