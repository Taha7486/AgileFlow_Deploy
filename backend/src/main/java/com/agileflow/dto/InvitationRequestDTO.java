package com.agileflow.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record InvitationRequestDTO(
        @Email @NotBlank String email,
        @NotNull Long projectId,
        String role
) {
}
