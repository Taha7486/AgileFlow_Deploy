package com.agileflow.dto;

public record SavedViewDto(
        Long id,
        String nom,
        String filtersJson
) {
}
