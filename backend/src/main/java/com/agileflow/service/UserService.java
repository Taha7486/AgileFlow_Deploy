package com.agileflow.service;

import com.agileflow.dto.*;
import com.agileflow.entity.Project;
import com.agileflow.entity.User;
import com.agileflow.exception.ConflictException;
import com.agileflow.exception.ForbiddenOperationException;
import com.agileflow.exception.ResourceNotFoundException;
import org.springframework.security.core.context.SecurityContextHolder;
import com.agileflow.repository.TeamMemberRepository;
import com.agileflow.repository.UserRepository;
import com.agileflow.repository.ProjectMemberRepository;
import com.agileflow.repository.ProjectRepository;
import com.agileflow.validation.PasswordValidator;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final TeamMemberRepository teamMemberRepository;
    private final ProjectRepository projectRepository;
    private final ProjectMemberRepository projectMemberRepository;
    private final ProjectAccessService projectAccessService;
    private final PasswordEncoder passwordEncoder;
    private final PasswordValidator passwordValidator;

    public static UserDTO toUserDTO(User u) {
        return new UserDTO(
                u.getId(),
                u.getEmail(),
                u.getPrenom(),
                u.getNom(),
                u.getRole().name(),
                u.getDateCreation() != null ? u.getDateCreation().toString() : null,
                u.isActif(),
                u.getDateDerniereConnexion() != null ? u.getDateDerniereConnexion().toString() : null,
                u.getAvatarUrl()
        );
    }

    @Transactional(readOnly = true)
    public List<UserDTO> listUsers(String q) {
        return listUsers(q, null);
    }

    @Transactional(readOnly = true)
    public List<UserDTO> listUsers(String q, Long projectId) {
        String query = (q == null || q.isBlank()) ? null : q.trim();
        if (projectId == null) {
            return userRepository.search(query).stream().map(UserService::toUserDTO).toList();
        }

        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new ResourceNotFoundException("Projet introuvable"));
        User actor = currentUser();
        projectAccessService.assertProjectAccess(actor, project);

        Set<Long> userIds = new HashSet<>(projectMemberRepository.findUserIdsByProjectId(projectId));
        if (project.getManager() != null) {
            userIds.add(project.getManager().getId());
        }

        return userRepository.search(query).stream()
                .filter(user -> userIds.contains(user.getId()))
                .map(UserService::toUserDTO)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<UserSearchResultDTO> searchUsersForProject(String q, Long projectId) {
        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new ResourceNotFoundException("Projet introuvable"));
        User actor = currentUser();
        if (!projectAccessService.canManageProject(actor, project)) {
            throw new ForbiddenOperationException("Vous ne pouvez pas inviter sur ce projet.");
        }
        String query = q == null || q.isBlank() ? null : q.trim();
        List<Long> memberIds = projectMemberRepository.findUserIdsByProjectId(projectId);
        Long ownerId = project.getManager() != null ? project.getManager().getId() : null;
        return userRepository.search(query).stream()
                .filter(User::isActif)
                .filter(user -> ownerId == null || !ownerId.equals(user.getId()))
                .filter(user -> !memberIds.contains(user.getId()))
                .limit(5)
                .map(user -> new UserSearchResultDTO(user.getId(), user.getNom(), user.getPrenom(), user.getEmail()))
                .toList();
    }

    private User currentUser() {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("Utilisateur courant introuvable"));
    }

    @Transactional(readOnly = true)
    public UserDetailDTO getMyProfile() {
        return getUserById(currentUser().getId());
    }

    @Transactional
    public UserDTO updateMyProfile(UpdateProfileRequest request) {
        User actor = currentUser();
        actor.setPrenom(request.firstName().trim());
        actor.setNom(request.lastName().trim());
        actor.setAvatarUrl(normalizeImageValue(request.avatarUrl()));
        userRepository.save(actor);
        return toUserDTO(actor);
    }

    @Transactional(readOnly = true)
    public UserDetailDTO getUserById(Long id) {
        User u = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Utilisateur introuvable"));
        List<TeamMembershipDTO> teams = teamMemberRepository.findByUser_Id(u.getId()).stream()
                .map(tm -> new TeamMembershipDTO(tm.getTeam().getId(), tm.getTeam().getName()))
                .toList();
        return new UserDetailDTO(
                u.getId(),
                u.getEmail(),
                u.getPrenom(),
                u.getNom(),
                u.getRole().name(),
                u.getDateCreation() != null ? u.getDateCreation().toString() : null,
                u.isActif(),
                u.getDateDerniereConnexion() != null ? u.getDateDerniereConnexion().toString() : null,
                u.getAvatarUrl(),
                teams
        );
    }

    @Transactional
    public UserDTO createUser(CreateUserRequest request) {
        passwordValidator.assertValid(request.password());
        User.Role role = normalizeAssignableRole(request.role());
        if (userRepository.existsByEmail(request.email())) {
            throw new ConflictException("Email déjà utilisé.");
        }
        User user = User.builder()
                .prenom(request.firstName())
                .nom(request.lastName())
                .email(request.email())
                .password(passwordEncoder.encode(request.password()))
                .role(role)
                .actif(true)
                .build();
        userRepository.save(user);
        return toUserDTO(user);
    }

    @Transactional
    public UserDTO updateUser(Long id, UpdateUserRequest request) {
        User u = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Utilisateur introuvable"));
        if (request.email() != null && !request.email().equalsIgnoreCase(u.getEmail())) {
            if (userRepository.existsByEmail(request.email())) {
                throw new ConflictException("Email déjà utilisé.");
            }
            u.setEmail(request.email());
        }
        if (request.firstName() != null) u.setPrenom(request.firstName());
        if (request.lastName() != null) u.setNom(request.lastName());
        if (request.role() != null) u.setRole(normalizeAssignableRole(request.role()));
        if (request.active() != null) u.setActif(request.active());
        if (request.password() != null && !request.password().isBlank()) {
            passwordValidator.assertValid(request.password());
            u.setPassword(passwordEncoder.encode(request.password()));
        }
        userRepository.save(u);
        return toUserDTO(u);
    }

    @Transactional
    public void softDeleteUser(Long id) {
        User u = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Utilisateur introuvable"));
        u.setActif(false);
        userRepository.save(u);
    }

    private User.Role normalizeAssignableRole(User.Role role) {
        if (role == null || role == User.Role.ROLE_MANAGER) {
            return User.Role.ROLE_DEVELOPER;
        }
        return role;
    }

    private String normalizeImageValue(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
