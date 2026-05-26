package com.agileflow.dto;

public record SavedViewRequest(
        String nom,
        String filtersJson
) {
}
