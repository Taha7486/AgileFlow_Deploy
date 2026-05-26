package com.agileflow.dto;

public record ProjectMemberDTO(
        Long userId,
        String email,
        String firstName,
        String lastName,
        String role,
        String projectRole,
        boolean owner,
        String joinedAt
) {}
