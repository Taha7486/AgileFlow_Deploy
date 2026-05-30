package com.agileflow.dto;

import com.agileflow.entity.ChatContactInvitation;

import java.time.LocalDateTime;

public record ChatContactInvitationDTO(
        Long id,
        Long requesterId,
        String requesterFirstName,
        String requesterLastName,
        String requesterEmail,
        String requesterAvatarUrl,
        Long recipientId,
        String recipientFirstName,
        String recipientLastName,
        String recipientEmail,
        String recipientAvatarUrl,
        ChatContactInvitation.InvitationStatus status,
        LocalDateTime createdAt,
        LocalDateTime respondedAt
) {}
