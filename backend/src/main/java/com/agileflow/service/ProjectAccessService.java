package com.agileflow.service;

import com.agileflow.entity.Project;
import com.agileflow.entity.ProjectMember;
import com.agileflow.entity.User;
import com.agileflow.exception.ForbiddenOperationException;
import com.agileflow.exception.ResourceNotFoundException;
import com.agileflow.repository.ProjectMemberRepository;
import com.agileflow.repository.ProjectRepository;
import com.agileflow.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class ProjectAccessService {

    private final ProjectRepository projectRepository;
    private final ProjectMemberRepository projectMemberRepository;
    private final UserRepository userRepository;

    @Transactional(readOnly = true)
    public User currentUser() {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("Utilisateur courant introuvable"));
    }

    public boolean isPlatformAdmin(User user) {
        return user.getRole() == User.Role.ROLE_ADMIN;
    }

    public boolean isProjectOwner(User user, Project project) {
        return project.getManager() != null && project.getManager().getId().equals(user.getId());
    }

    @Transactional(readOnly = true)
    public boolean isProjectMember(User user, Long projectId) {
        return projectMemberRepository.existsByProject_IdAndUser_Id(projectId, user.getId());
    }

    @Transactional(readOnly = true)
    public ProjectMember.ProjectRole getProjectRole(User user, Project project) {
        if (isPlatformAdmin(user) || isProjectOwner(user, project)) {
            return ProjectMember.ProjectRole.ADMIN;
        }
        return projectMemberRepository.findByProject_IdAndUser_Id(project.getId(), user.getId())
                .map(ProjectMember::getRole)
                .orElse(null);
    }

    @Transactional(readOnly = true)
    public boolean hasProjectAccess(User user, Project project) {
        if (isPlatformAdmin(user)) {
            return true;
        }
        if (project.getStatut() == Project.Statut.ARCHIVE) {
            return false;
        }
        return isProjectOwner(user, project) || isProjectMember(user, project.getId());
    }

    @Transactional(readOnly = true)
    public boolean canManageProject(User user, Project project) {
        if (isPlatformAdmin(user)) {
            return true;
        }
        if (project.getStatut() == Project.Statut.ARCHIVE) {
            return false;
        }
        if (isProjectOwner(user, project)) {
            return true;
        }
        return projectMemberRepository.findByProject_IdAndUser_Id(project.getId(), user.getId())
                .map(ProjectMember::getRole)
                .filter(role -> role == ProjectMember.ProjectRole.ADMIN)
                .isPresent();
    }

    @Transactional(readOnly = true)
    public boolean canEditProjectContent(User user, Project project) {
        if (canManageProject(user, project)) {
            return true;
        }
        return projectMemberRepository.findByProject_IdAndUser_Id(project.getId(), user.getId())
                .map(ProjectMember::getRole)
                .map(role -> role == null || role == ProjectMember.ProjectRole.DEVELOPER)
                .orElse(false);
    }

    @Transactional(readOnly = true)
    public Project getProjectOrThrow(Long projectId) {
        return projectRepository.findById(projectId)
                .orElseThrow(() -> new ResourceNotFoundException("Projet introuvable"));
    }

    public void assertProjectAccess(User user, Project project) {
        if (!hasProjectAccess(user, project)) {
            if (!isPlatformAdmin(user) && project.getStatut() == Project.Statut.ARCHIVE) {
                throw new ForbiddenOperationException("Ce projet est archive et n'est plus accessible.");
            }
            throw new ForbiddenOperationException("Vous n'avez pas acces a ce projet.");
        }
    }

    public void assertCanManageProject(User user, Project project) {
        if (!canManageProject(user, project)) {
            throw new ForbiddenOperationException("Seul le proprietaire ou un admin du projet peut effectuer cette action.");
        }
    }

    public void assertCanEditProjectContent(User user, Project project) {
        if (!canEditProjectContent(user, project)) {
            throw new ForbiddenOperationException("Vous n'avez pas les droits pour modifier le contenu de ce projet.");
        }
    }
}
