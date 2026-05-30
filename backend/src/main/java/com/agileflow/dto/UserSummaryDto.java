package com.agileflow.dto;

public record UserSummaryDto(
        Long id,
        String nom,
        String prenom,
        String email,
        String initiales,
        String avatarColor,
        String avatarUrl
) {
}
