package com.agileflow.service;

import com.agileflow.dto.*;
import com.agileflow.entity.*;
import com.agileflow.exception.BadRequestException;
import com.agileflow.exception.ConflictException;
import com.agileflow.exception.ForbiddenOperationException;
import com.agileflow.exception.ResourceNotFoundException;
import com.agileflow.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ProjectMemberService {

    private static final int INVITATION_VALIDITY_DAYS = 7;

    private final ProjectRepository projectRepository;
    private final ProjectMemberRepository projectMemberRepository;
    private final ProjectInvitationRepository projectInvitationRepository;
    private final UserRepository userRepository;
    private final ChatContactInvitationRepository chatContactInvitationRepository;
    private final ProjectAccessService projectAccessService;
    private final ProjectInvitationEmailService projectInvitationEmailService;
    private final NotificationService notificationService;
    private final TaskRepository taskRepository;

    @Transactional(readOnly = true)
    public List<ProjectMemberDTO> listMembers(Long projectId) {
        Project project = projectAccessService.getProjectOrThrow(projectId);
        User actor = projectAccessService.currentUser();
        projectAccessService.assertProjectAccess(actor, project);

        List<ProjectMemberDTO> members = new ArrayList<>();
        User owner = project.getManager();
        if (owner != null) {
            members.add(toMemberDto(owner, true, project.getDateDebut() != null ? project.getDateDebut().atStartOfDay() : LocalDateTime.now()));
        }
        projectMemberRepository.findByProject_IdOrderByJoinedAtAsc(projectId).stream()
                .map(pm -> toMemberDto(pm.getUser(), false, pm.getJoinedAt(), pm.getRole()))
                .forEach(members::add);
        return members;
    }

    @Transactional(readOnly = true)
    public List<ProjectInvitationDTO> listPendingInvitationsForProject(Long projectId) {
        Project project = projectAccessService.getProjectOrThrow(projectId);
        User actor = projectAccessService.currentUser();
        projectAccessService.assertCanManageProject(actor, project);
        return projectInvitationRepository.findPendingByProjectId(projectId).stream()
                .map(this::toInvitationDto)
                .toList();
    }

    @Transactional(readOnly = true)
    public ProjectMemberStatsDTO stats(Long projectId) {
        Project project = projectAccessService.getProjectOrThrow(projectId);
        User actor = projectAccessService.currentUser();
        projectAccessService.assertProjectAccess(actor, project);

        List<Task> tasks = taskRepository.findByAnyProjectId(projectId);
        long total = tasks.size();
        long done = tasks.stream().filter(task -> task.getStatut() == Task.Statut.DONE).count();
        long assigned = tasks.stream().filter(task -> task.getAssignedTo() != null).count();
        long pending = projectInvitationRepository.findPendingByProjectId(projectId).size();
        long active = listMembers(projectId).size();
        int completionRate = total == 0 ? 0 : (int) Math.round((done * 100.0) / total);
        return new ProjectMemberStatsDTO(active, pending, assigned, completionRate);
    }

    @Transactional(readOnly = true)
    public List<ProjectInvitationDTO> listReceivedInvitations() {
        User actor = projectAccessService.currentUser();
        return projectInvitationRepository.findPendingByEmail(actor.getEmail()).stream()
                .map(this::toInvitationDto)
                .toList();
    }

    @Transactional
    public InviteProjectMemberResultDTO inviteMember(Long projectId, InviteProjectMemberRequest request) {
        Project project = projectAccessService.getProjectOrThrow(projectId);
        User actor = projectAccessService.currentUser();
        projectAccessService.assertCanManageProject(actor, project);

        ProjectMember.ProjectRole role = parseRole(request.role());

        if (request.userId() != null) {
            return inviteContact(project, actor, request.userId(), role);
        }
        if (request.email() != null && !request.email().isBlank()) {
            return inviteByEmail(project, actor, request.email().trim().toLowerCase(), role);
        }
        throw new BadRequestException("Indiquez un contact ou une adresse email.");
    }

    @Transactional
    public void removeMember(Long projectId, Long userId) {
        Project project = projectAccessService.getProjectOrThrow(projectId);
        User actor = projectAccessService.currentUser();
        projectAccessService.assertCanManageProject(actor, project);

        if (project.getManager() != null && project.getManager().getId().equals(userId)) {
            throw new BadRequestException("Impossible de retirer le proprietaire du projet.");
        }
        if (!projectMemberRepository.existsByProject_IdAndUser_Id(projectId, userId)) {
            throw new ResourceNotFoundException("Membre introuvable sur ce projet.");
        }
        projectMemberRepository.deleteByProject_IdAndUser_Id(projectId, userId);
    }

    @Transactional
    public ProjectMemberDTO updateRole(Long projectId, Long userId, UpdateProjectMemberRoleRequest request) {
        Project project = projectAccessService.getProjectOrThrow(projectId);
        User actor = projectAccessService.currentUser();
        projectAccessService.assertCanManageProject(actor, project);

        if (project.getManager() != null && project.getManager().getId().equals(userId)) {
            throw new BadRequestException("Le role du proprietaire ne peut pas etre modifie.");
        }

        ProjectMember member = projectMemberRepository.findByProject_IdAndUser_Id(projectId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Membre introuvable sur ce projet."));
        member.setRole(parseRole(request != null ? request.role() : null));
        ProjectMember saved = projectMemberRepository.save(member);
        return toMemberDto(saved.getUser(), false, saved.getJoinedAt(), saved.getRole());
    }

    @Transactional
    public void resendInvitation(Long projectId, Long invitationId) {
        Project project = projectAccessService.getProjectOrThrow(projectId);
        User actor = projectAccessService.currentUser();
        projectAccessService.assertCanManageProject(actor, project);

        ProjectInvitation invitation = projectInvitationRepository.findById(invitationId)
                .orElseThrow(() -> new ResourceNotFoundException("Invitation introuvable"));
        if (!invitation.getProject().getId().equals(projectId)) {
            throw new ForbiddenOperationException("Cette invitation n'appartient pas au projet.");
        }
        assertInvitationPending(invitation);
        invitation.setExpiresAt(LocalDateTime.now().plusDays(INVITATION_VALIDITY_DAYS));
        ProjectInvitation saved = projectInvitationRepository.save(invitation);
        projectInvitationEmailService.sendProjectInvitation(saved.getEmail(), actor, project, saved.getToken());
    }

    @Transactional(readOnly = true)
    public ProjectInvitationPreviewDTO previewInvitation(String token) {
        ProjectInvitation invitation = projectInvitationRepository.findByToken(token)
                .orElseThrow(() -> new ResourceNotFoundException("Invitation introuvable"));
        boolean expired = LocalDateTime.now().isAfter(invitation.getExpiresAt());
        boolean accepted = invitation.getStatus() == ProjectInvitation.InvitationStatus.ACCEPTED;
        User owner = invitation.getProject().getManager();
        String ownerName = owner != null ? owner.getPrenom() + " " + owner.getNom() : "Proprietaire";
        return new ProjectInvitationPreviewDTO(
                invitation.getProject().getNom(),
                ownerName,
                invitation.getEmail(),
                expired,
                accepted
        );
    }

    @Transactional
    public ProjectMemberDTO acceptInvitation(AcceptProjectInvitationRequest request) {
        User actor = projectAccessService.currentUser();
        ProjectInvitation invitation = resolveInvitation(request);
        return acceptInvitationInternal(actor, invitation);
    }

    @Transactional
    public void rejectInvitation(AcceptProjectInvitationRequest request) {
        User actor = projectAccessService.currentUser();
        ProjectInvitation invitation = resolveInvitation(request);
        assertInvitationRecipient(actor, invitation);
        assertInvitationPending(invitation);

        invitation.setStatus(ProjectInvitation.InvitationStatus.REJECTED);
        projectInvitationRepository.save(invitation);
    }

    @Transactional
    public void rejectInvitation(Long invitationId) {
        rejectInvitation(new AcceptProjectInvitationRequest(null, invitationId));
    }

    private InviteProjectMemberResultDTO inviteContact(Project project, User actor, Long userId, ProjectMember.ProjectRole role) {
        if (project.getManager() != null && project.getManager().getId().equals(userId)) {
            throw new ConflictException("Cet utilisateur est deja proprietaire du projet.");
        }
        User invitee = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Utilisateur introuvable"));
        if (!invitee.isActif()) {
            throw new BadRequestException("Cet utilisateur n'est pas actif.");
        }
        if (!chatContactInvitationRepository.areContacts(actor.getId(), userId)) {
            throw new ForbiddenOperationException(
                    "Vous devez etre en contact avec cet utilisateur. Sinon, invitez-le par email."
            );
        }
        return createPendingInvitation(project, actor, invitee, false, role);
    }

    private InviteProjectMemberResultDTO inviteByEmail(Project project, User actor, String email, ProjectMember.ProjectRole role) {
        if (project.getManager() != null && project.getManager().getEmail().equalsIgnoreCase(email)) {
            throw new ConflictException("Cette personne est deja proprietaire du projet.");
        }

        User existing = userRepository.findByEmail(email).orElse(null);
        if (existing != null) {
            if (projectMemberRepository.existsByProject_IdAndUser_Id(project.getId(), existing.getId())) {
                throw new ConflictException("Cet utilisateur est deja membre du projet.");
            }
            return createPendingInvitation(project, actor, existing, true, role);
        }

        if (projectInvitationRepository.existsByProject_IdAndEmailIgnoreCaseAndStatus(
                project.getId(), email, ProjectInvitation.InvitationStatus.PENDING)) {
            throw new ConflictException("Une invitation est deja en attente pour cet email.");
        }

        return createPendingInvitation(project, actor, email, true, role);
    }

    private InviteProjectMemberResultDTO createPendingInvitation(Project project, User actor, User invitee, boolean sendEmail, ProjectMember.ProjectRole role) {
        validateNoPendingInvitation(project, invitee.getEmail(), invitee.getId());

        ProjectInvitation invitation = saveInvitation(project, actor, invitee.getEmail(), invitee, sendEmail, role);
        notifyInvitationReceived(invitee, actor, project, invitation, sendEmail);

        String message = sendEmail
                ? "Invitation envoyee. La personne pourra accepter depuis l'application ou le lien email."
                : "Invitation envoyee. Votre contact pourra l'accepter ou la refuser dans l'application.";

        return new InviteProjectMemberResultDTO("INVITATION_SENT", message, null);
    }

    private InviteProjectMemberResultDTO createPendingInvitation(Project project, User actor, String email, boolean sendEmail, ProjectMember.ProjectRole role) {
        validateNoPendingInvitation(project, email, null);

        ProjectInvitation invitation = saveInvitation(project, actor, email, null, sendEmail, role);
        userRepository.findByEmail(email).ifPresent(user -> notifyInvitationReceived(user, actor, project, invitation, sendEmail));

        return new InviteProjectMemberResultDTO(
                "INVITATION_SENT",
                "Une invitation a ete envoyee par email a " + email + ". La personne pourra accepter via le lien.",
                null
        );
    }

    private ProjectInvitation saveInvitation(Project project, User actor, String email, User invitedUser, boolean sendEmail, ProjectMember.ProjectRole role) {
        String token = UUID.randomUUID().toString().replace("-", "");
        ProjectInvitation invitation = ProjectInvitation.builder()
                .project(project)
                .invitedBy(actor)
                .email(email)
                .invitedUser(invitedUser)
                .token(token)
                .role(role)
                .status(ProjectInvitation.InvitationStatus.PENDING)
                .expiresAt(LocalDateTime.now().plusDays(INVITATION_VALIDITY_DAYS))
                .build();
        ProjectInvitation saved = projectInvitationRepository.save(invitation);
        if (sendEmail) {
            projectInvitationEmailService.sendProjectInvitation(email, actor, project, token);
        }
        return saved;
    }

    private void notifyInvitationReceived(User recipient, User inviter, Project project, ProjectInvitation invitation, boolean mentionEmail) {
        String suffix = mentionEmail ? " Consultez votre email ou acceptez dans l'application." : " Acceptez ou refusez dans l'application.";
        notificationService.createAndBroadcast(
                recipient,
                inviter.getPrenom() + " " + inviter.getNom() + " vous invite au projet \"" + project.getNom() + "\"." + suffix
        );
    }

    private void validateNoPendingInvitation(Project project, String email, Long userId) {
        if (projectInvitationRepository.existsPendingForProjectAndUser(project.getId(), email, userId)) {
            throw new ConflictException("Une invitation est deja en attente pour cet utilisateur.");
        }
        if (userId != null && projectMemberRepository.existsByProject_IdAndUser_Id(project.getId(), userId)) {
            throw new ConflictException("Cet utilisateur est deja membre du projet.");
        }
    }

    private ProjectInvitation resolveInvitation(AcceptProjectInvitationRequest request) {
        if (request.invitationId() != null) {
            return projectInvitationRepository.findById(request.invitationId())
                    .orElseThrow(() -> new ResourceNotFoundException("Invitation introuvable"));
        }
        if (request.token() != null && !request.token().isBlank()) {
            return projectInvitationRepository.findByToken(request.token())
                    .orElseThrow(() -> new ResourceNotFoundException("Invitation introuvable"));
        }
        throw new BadRequestException("Invitation invalide.");
    }

    private ProjectMemberDTO acceptInvitationInternal(User actor, ProjectInvitation invitation) {
        assertInvitationRecipient(actor, invitation);
        assertInvitationPending(invitation);

        if (LocalDateTime.now().isAfter(invitation.getExpiresAt())) {
            throw new BadRequestException("Cette invitation a expire.");
        }

        Project project = invitation.getProject();
        addMemberIfNeeded(project, actor, invitation.getRole());
        invitation.setStatus(ProjectInvitation.InvitationStatus.ACCEPTED);
        invitation.setAcceptedUser(actor);
        projectInvitationRepository.save(invitation);

        User inviter = invitation.getInvitedBy();
        notificationService.createAndBroadcast(
                inviter,
                actor.getPrenom() + " " + actor.getNom() + " a accepte votre invitation au projet " + project.getNom()
        );

        return toMemberDto(actor, false, LocalDateTime.now());
    }

    private void assertInvitationRecipient(User actor, ProjectInvitation invitation) {
        if (!actor.getEmail().equalsIgnoreCase(invitation.getEmail())) {
            throw new ForbiddenOperationException("Cette invitation ne vous est pas destinee.");
        }
    }

    private void assertInvitationPending(ProjectInvitation invitation) {
        if (invitation.getStatus() == ProjectInvitation.InvitationStatus.ACCEPTED) {
            throw new ConflictException("Cette invitation a deja ete acceptee.");
        }
        if (invitation.getStatus() == ProjectInvitation.InvitationStatus.REJECTED) {
            throw new BadRequestException("Cette invitation a ete refusee.");
        }
        if (invitation.getStatus() != ProjectInvitation.InvitationStatus.PENDING) {
            throw new BadRequestException("Cette invitation n'est plus valide.");
        }
    }

    private void addMemberIfNeeded(Project project, User user, ProjectMember.ProjectRole role) {
        if (project.getManager() != null && project.getManager().getId().equals(user.getId())) {
            return;
        }
        if (projectMemberRepository.existsByProject_IdAndUser_Id(project.getId(), user.getId())) {
            return;
        }
        projectMemberRepository.save(ProjectMember.builder()
                .project(project)
                .user(user)
                .role(role != null ? role : ProjectMember.ProjectRole.DEVELOPER)
                .joinedAt(LocalDateTime.now())
                .build());
    }

    private ProjectInvitationDTO toInvitationDto(ProjectInvitation invitation) {
        User inviter = invitation.getInvitedBy();
        return new ProjectInvitationDTO(
                invitation.getId(),
                invitation.getProject().getId(),
                invitation.getProject().getNom(),
                inviter.getId(),
                inviter.getPrenom(),
                inviter.getNom(),
                invitation.getEmail(),
                invitation.getInvitedUser() != null ? invitation.getInvitedUser().getId() : null,
                invitation.getRole() != null ? invitation.getRole().name() : ProjectMember.ProjectRole.DEVELOPER.name(),
                invitation.getStatus(),
                invitation.getCreatedAt(),
                invitation.getExpiresAt(),
                invitation.getToken()
        );
    }

    private ProjectMemberDTO toMemberDto(User user, boolean owner, LocalDateTime joinedAt) {
        return toMemberDto(user, owner, joinedAt, ProjectMember.ProjectRole.DEVELOPER);
    }

    private ProjectMemberDTO toMemberDto(User user, boolean owner, LocalDateTime joinedAt, ProjectMember.ProjectRole projectRole) {
        return new ProjectMemberDTO(
                user.getId(),
                user.getEmail(),
                user.getPrenom(),
                user.getNom(),
                user.getRole().name(),
                owner ? "OWNER" : (projectRole != null ? projectRole.name() : ProjectMember.ProjectRole.DEVELOPER.name()),
                owner,
                joinedAt != null ? joinedAt.toString() : null
        );
    }

    private ProjectMember.ProjectRole parseRole(String role) {
        if (role == null || role.isBlank()) {
            return ProjectMember.ProjectRole.DEVELOPER;
        }
        String normalized = role.trim().toUpperCase();
        if ("OWNER".equals(normalized)) {
            throw new BadRequestException("Le role OWNER est reserve au proprietaire du projet.");
        }
        try {
            return ProjectMember.ProjectRole.valueOf(normalized);
        } catch (IllegalArgumentException ex) {
            throw new BadRequestException("Role projet invalide: " + role);
        }
    }
}
