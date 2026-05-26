package com.agileflow.dto;

public record UserSearchResultDTO(
        Long id,
        String nom,
        String prenom,
        String email
) {
}
