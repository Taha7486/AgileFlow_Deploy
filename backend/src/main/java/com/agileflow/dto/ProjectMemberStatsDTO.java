package com.agileflow.dto;

public record ProjectMemberStatsDTO(
        long activeMembers,
        long pendingInvitations,
        long assignedTasks,
        int completionRate
) {}
