package com.agileflow.dto;

public record ProjectDTO(
        Long id,
        String name,
        String issuePrefix,
        String description,
        String iconUrl,
        String startDate,
        String endDate,
        String status,
        Long managerId,
        String managerName,
        Long teamId,
        String teamName,
        Long sprintCount,
        Long taskCount,
        boolean owner,
        long memberCount
) {}
