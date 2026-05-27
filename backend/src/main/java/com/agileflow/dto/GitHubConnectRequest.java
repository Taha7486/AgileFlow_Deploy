package com.agileflow.dto;

import jakarta.validation.constraints.NotBlank;

public record GitHubConnectRequest(
        @NotBlank String repoOwner,
        @NotBlank String repoName,
        @NotBlank String accessToken
) {
}
