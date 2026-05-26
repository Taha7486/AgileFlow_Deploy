package com.agileflow.controller;

import com.agileflow.dto.InvitationRequestDTO;
import com.agileflow.dto.InvitationResponseDTO;
import com.agileflow.dto.InvitationValidationDTO;
import com.agileflow.entity.User;
import com.agileflow.service.InvitationService;
import com.agileflow.service.ProjectAccessService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequiredArgsConstructor
public class InvitationController {

    private final InvitationService invitationService;
    private final ProjectAccessService projectAccessService;

    @PostMapping("/api/projects/{projectId}/invite")
    @PreAuthorize("isAuthenticated()")
    public InvitationResponseDTO invite(@PathVariable Long projectId, @Valid @RequestBody InvitationRequestDTO request) {
        User currentUser = projectAccessService.currentUser();
        InvitationRequestDTO normalizedRequest = new InvitationRequestDTO(request.email(), projectId, request.role());
        return invitationService.inviter(normalizedRequest, currentUser);
    }

    @GetMapping("/api/invitations/validate")
    public InvitationValidationDTO validate(@RequestParam String token) {
        return invitationService.validerToken(token);
    }
}
