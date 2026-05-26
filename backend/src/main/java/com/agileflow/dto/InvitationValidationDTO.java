package com.agileflow.dto;

public record InvitationValidationDTO(
        String email,
        Long projectId,
        String projectName
) {
}
