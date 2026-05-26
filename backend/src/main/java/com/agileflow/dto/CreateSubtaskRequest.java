package com.agileflow.dto;

import com.agileflow.entity.TypeTache;

public record CreateSubtaskRequest(
    String titre,
    TypeTache typeTache,
    String description,
    Long assigneeId,
    String priorite
) {}
