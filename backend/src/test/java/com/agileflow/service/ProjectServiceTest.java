package com.agileflow.service;

import com.agileflow.dto.CreateProjectRequest;
import com.agileflow.dto.ProjectDTO;
import com.agileflow.dto.UpdateProjectRequest;
import com.agileflow.entity.Project;
import com.agileflow.entity.User;
import com.agileflow.exception.ForbiddenOperationException;
import com.agileflow.repository.ActivityLogRepository;
import com.agileflow.repository.BacklogRepository;
import com.agileflow.repository.ChatMessageRepository;
import com.agileflow.repository.CommentRepository;
import com.agileflow.repository.DiagramRepository;
import com.agileflow.repository.EpicRepository;
import com.agileflow.repository.GitHubIntegrationRepository;
import com.agileflow.repository.GitHubTaskBranchRepository;
import com.agileflow.repository.ProjectInvitationRepository;
import com.agileflow.repository.ProjectMemberRepository;
import com.agileflow.repository.ProjectRepository;
import com.agileflow.repository.SprintRepository;
import com.agileflow.repository.TaskRepository;
import com.agileflow.repository.TeamRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ProjectServiceTest {

    @Mock
    private ProjectRepository projectRepository;

    @Mock
    private SprintRepository sprintRepository;

    @Mock
    private TaskRepository taskRepository;

    @Mock
    private TeamRepository teamRepository;

    @Mock
    private ProjectMemberRepository projectMemberRepository;

    @Mock
    private ProjectInvitationRepository projectInvitationRepository;

    @Mock
    private GitHubIntegrationRepository gitHubIntegrationRepository;

    @Mock
    private GitHubTaskBranchRepository gitHubTaskBranchRepository;

    @Mock
    private DiagramRepository diagramRepository;

    @Mock
    private CommentRepository commentRepository;

    @Mock
    private ChatMessageRepository chatMessageRepository;

    @Mock
    private ActivityLogRepository activityLogRepository;

    @Mock
    private BacklogRepository backlogRepository;

    @Mock
    private EpicRepository epicRepository;

    @Mock
    private ActivityLogger activityLogger;

    private ProjectService projectService;

    private TestProjectAccessService projectAccessService;

    private User owner;
    private User otherUser;
    private Project project;

    @BeforeEach
    void setUp() {
        owner = User.builder()
                .id(1L)
                .email("owner@agileflow.dev")
                .prenom("Sara")
                .nom("Owner")
                .role(User.Role.ROLE_DEVELOPER)
                .actif(true)
                .build();

        otherUser = User.builder()
                .id(2L)
                .email("other@agileflow.dev")
                .prenom("Lina")
                .nom("Other")
                .role(User.Role.ROLE_DEVELOPER)
                .actif(true)
                .build();

        project = Project.builder()
                .id(10L)
                .nom("Migration API")
                .description("Refonte du module projets")
                .dateDebut(LocalDate.of(2026, 4, 1))
                .dateFin(LocalDate.of(2026, 6, 1))
                .statut(Project.Statut.ACTIF)
                .manager(owner)
                .build();

        projectAccessService = new TestProjectAccessService();
        projectService = new ProjectService(
                projectRepository,
                sprintRepository,
                taskRepository,
                teamRepository,
                projectMemberRepository,
                projectInvitationRepository,
                gitHubIntegrationRepository,
                gitHubTaskBranchRepository,
                diagramRepository,
                commentRepository,
                chatMessageRepository,
                activityLogRepository,
                backlogRepository,
                epicRepository,
                activityLogger,
                projectAccessService
        );
    }

    @Test
    void createProject_setsCurrentUserAsOwner() {
        projectAccessService.currentUser = owner;
        when(projectRepository.save(any(Project.class))).thenAnswer(invocation -> {
            Project saved = invocation.getArgument(0);
            saved.setId(99L);
            return saved;
        });
        when(sprintRepository.findByProjectId(99L)).thenReturn(List.of());
        when(projectMemberRepository.countByProject_Id(99L)).thenReturn(0L);

        ProjectDTO dto = projectService.createProject(new CreateProjectRequest(
                "Portail Web",
                "WEB",
                "Nouveau projet client",
                null,
                LocalDate.of(2026, 5, 1),
                LocalDate.of(2026, 7, 15),
                Project.Statut.ACTIF,
                null,
                null
        ));

        ArgumentCaptor<Project> captor = ArgumentCaptor.forClass(Project.class);
        verify(projectRepository).save(captor.capture());
        Project saved = captor.getValue();

        assertThat(saved.getNom()).isEqualTo("Portail Web");
        assertThat(saved.getIssuePrefix()).isEqualTo("WEB");
        assertThat(saved.getManager()).isEqualTo(owner);
        assertThat(dto.id()).isEqualTo(99L);
        assertThat(dto.managerName()).isEqualTo("Sara Owner");
        assertThat(dto.owner()).isTrue();
    }

    @Test
    void updateProject_rejectsNonOwner() {
        projectAccessService.project = project;
        projectAccessService.currentUser = otherUser;
        projectAccessService.rejectManage = true;

        assertThatThrownBy(() -> projectService.updateProject(project.getId(), new UpdateProjectRequest(
                "Migration API v2",
                "MAP",
                "Tentative de modification",
                null,
                LocalDate.of(2026, 4, 1),
                LocalDate.of(2026, 6, 1),
                Project.Statut.ACTIF,
                null
        ))).isInstanceOf(ForbiddenOperationException.class);

        verify(projectRepository, never()).save(any(Project.class));
    }

    @Test
    void deleteProject_archivesProjectEvenWithSprints() {
        projectAccessService.project = project;
        projectAccessService.currentUser = owner;
        when(projectRepository.save(any(Project.class))).thenAnswer(invocation -> invocation.getArgument(0));

        projectService.deleteProject(project.getId());

        assertThat(project.getStatut()).isEqualTo(Project.Statut.ARCHIVE);
        verify(projectRepository).save(project);
    }

    private static class TestProjectAccessService extends ProjectAccessService {
        private User currentUser;
        private Project project;
        private boolean rejectManage;

        TestProjectAccessService() {
            super(null, null, null);
        }

        @Override
        public User currentUser() {
            return currentUser;
        }

        @Override
        public Project getProjectOrThrow(Long projectId) {
            return project;
        }

        @Override
        public void assertCanManageProject(User user, Project project) {
            if (rejectManage) {
                throw new ForbiddenOperationException("Seul le proprietaire du projet peut effectuer cette action.");
            }
        }
    }
}
