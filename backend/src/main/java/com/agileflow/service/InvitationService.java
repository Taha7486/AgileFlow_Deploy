package com.agileflow.service;

import com.agileflow.dto.InvitationRequestDTO;
import com.agileflow.dto.InvitationResponseDTO;
import com.agileflow.dto.InvitationValidationDTO;
import com.agileflow.entity.Project;
import com.agileflow.entity.ProjectInvitation;
import com.agileflow.entity.ProjectMember;
import com.agileflow.entity.User;
import com.agileflow.exception.ConflictException;
import com.agileflow.exception.ForbiddenOperationException;
import com.agileflow.exception.ResourceNotFoundException;
import com.agileflow.repository.ProjectInvitationRepository;
import com.agileflow.repository.ProjectMemberRepository;
import com.agileflow.repository.ProjectRepository;
import com.agileflow.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.LocalDateTime;
import java.util.HexFormat;
import java.util.Locale;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class InvitationService {

    private static final int EXPIRATION_HOURS = 72;

    private final UserRepository userRepository;
    private final ProjectRepository projectRepository;
    private final ProjectInvitationRepository projectInvitationRepository;
    private final ProjectMemberRepository projectMemberRepository;
    private final EmailNotificationService emailNotificationService;
    private final EmailTemplateService emailTemplateService;
    private final ProjectAccessService projectAccessService;

    @Value("${app.frontend-url:http://localhost:5173}")
    private String frontendUrl;

    @Transactional
    public InvitationResponseDTO inviter(InvitationRequestDTO dto, User currentUser) {
        Project project = projectRepository.findById(dto.projectId())
                .orElseThrow(() -> new ResourceNotFoundException("Projet introuvable"));
        assertCanInvite(currentUser, project);

        String email = normalizeEmail(dto.email());
        if (project.getManager() != null && project.getManager().getEmail().equalsIgnoreCase(email)) {
            throw new ConflictException("Cette personne est deja proprietaire du projet.");
        }

        User existing = userRepository.findByEmail(email).orElse(null);
        if (existing != null) {
            addMemberIfNeeded(project, existing);
            String projectUrl = joinUrl(frontendUrl, "/projects");
            emailNotificationService.sendDirectEmail(
                    existing.getEmail(),
                    emailTemplateService.buildProjectAdded(existing, project, currentUser, projectUrl)
            );
            return new InvitationResponseDTO("ADDED", "Utilisateur ajoute au projet et notifie par email.");
        }

        if (projectInvitationRepository.existsByProject_IdAndEmailIgnoreCaseAndStatusAndExpiresAtAfter(
                project.getId(),
                email,
                ProjectInvitation.InvitationStatus.PENDING,
                LocalDateTime.now())) {
            throw new ConflictException("Une invitation valide existe deja pour cet email.");
        }

        String rawToken = UUID.randomUUID().toString();
        String tokenHash = sha256(rawToken);
        ProjectInvitation invitation = ProjectInvitation.builder()
                .project(project)
                .invitedBy(currentUser)
                .email(email)
                .token(tokenHash)
                .status(ProjectInvitation.InvitationStatus.PENDING)
                .expiresAt(LocalDateTime.now().plusHours(EXPIRATION_HOURS))
                .build();
        projectInvitationRepository.save(invitation);

        String registerUrl = joinUrl(frontendUrl, "/register")
                + "?invitation=" + rawToken
                + "&email=" + email;
        emailNotificationService.sendDirectEmail(
                email,
                emailTemplateService.buildProjectInvitation(email, project, currentUser, registerUrl)
        );
        return new InvitationResponseDTO("INVITED", "Invitation envoyee par email.");
    }

    @Transactional(readOnly = true)
    public InvitationValidationDTO validerToken(String rawToken) {
        ProjectInvitation invitation = findValidInvitationByRawToken(rawToken);
        Project project = invitation.getProject();
        return new InvitationValidationDTO(invitation.getEmail(), project.getId(), project.getNom());
    }

    @Transactional
    public void appliquerInvitation(String rawToken, User newUser) {
        appliquerInvitationHash(sha256(rawToken), newUser);
    }

    @Transactional
    public void appliquerInvitationHash(String tokenHash, User newUser) {
        if (tokenHash == null || tokenHash.isBlank()) {
            return;
        }
        ProjectInvitation invitation = projectInvitationRepository
                .findByTokenAndStatusAndExpiresAtAfter(tokenHash, ProjectInvitation.InvitationStatus.PENDING, LocalDateTime.now())
                .orElseThrow(() -> new ResourceNotFoundException("Invitation invalide ou expiree"));
        if (!invitation.getEmail().equalsIgnoreCase(newUser.getEmail())) {
            throw new ForbiddenOperationException("Cette invitation ne correspond pas a cet email.");
        }
        addMemberIfNeeded(invitation.getProject(), newUser);
        invitation.setStatus(ProjectInvitation.InvitationStatus.ACCEPTED);
        invitation.setAcceptedUser(newUser);
        projectInvitationRepository.save(invitation);
    }

    @Transactional(readOnly = true)
    public void assertInvitationMatchesEmail(String rawToken, String email) {
        ProjectInvitation invitation = findValidInvitationByRawToken(rawToken);
        if (!invitation.getEmail().equalsIgnoreCase(normalizeEmail(email))) {
            throw new ForbiddenOperationException("Cette invitation ne correspond pas a cet email.");
        }
    }

    public String hashToken(String rawToken) {
        return sha256(rawToken);
    }

    private ProjectInvitation findValidInvitationByRawToken(String rawToken) {
        if (rawToken == null || rawToken.isBlank()) {
            throw new ResourceNotFoundException("Invitation invalide");
        }
        return projectInvitationRepository
                .findByTokenAndStatusAndExpiresAtAfter(sha256(rawToken), ProjectInvitation.InvitationStatus.PENDING, LocalDateTime.now())
                .orElseThrow(() -> new ResourceNotFoundException("Invitation invalide ou expiree"));
    }

    private void addMemberIfNeeded(Project project, User user) {
        if (project.getManager() != null && project.getManager().getId().equals(user.getId())) {
            return;
        }
        if (projectMemberRepository.existsByProject_IdAndUser_Id(project.getId(), user.getId())) {
            throw new ConflictException("Cet utilisateur est deja membre du projet.");
        }
        projectMemberRepository.save(ProjectMember.builder()
                .project(project)
                .user(user)
                .joinedAt(LocalDateTime.now())
                .build());
    }

    private void assertCanInvite(User currentUser, Project project) {
        if (!projectAccessService.canManageProject(currentUser, project)) {
            throw new ForbiddenOperationException("Seul le proprietaire du projet ou un administrateur peut inviter.");
        }
    }

    private String normalizeEmail(String email) {
        return email == null ? "" : email.trim().toLowerCase(Locale.ROOT);
    }

    private String joinUrl(String base, String path) {
        String cleanBase = base.endsWith("/") ? base.substring(0, base.length() - 1) : base;
        return cleanBase + path;
    }

    private String sha256(String input) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(digest.digest(input.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception e) {
            throw new IllegalStateException("Hash SHA-256 indisponible", e);
        }
    }
}
