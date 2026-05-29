package com.agileflow.controller;

import com.agileflow.dto.*;
import com.agileflow.entity.Project;
import com.agileflow.entity.Task;
import com.agileflow.entity.User;
import com.agileflow.repository.TaskRepository;
import com.agileflow.exception.ResourceNotFoundException;
import com.agileflow.service.GitHubService;
import com.agileflow.service.ProjectAccessService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/github")
@RequiredArgsConstructor
public class GitHubController {

    private final GitHubService gitHubService;
    private final ProjectAccessService projectAccessService;
    private final TaskRepository taskRepository;

    @PostMapping("/projects/{projectId}/connect")
    public ResponseEntity<GitHubIntegrationDTO> connect(
            @PathVariable Long projectId,
            @Valid @RequestBody GitHubConnectRequest request
    ) {
        User currentUser = projectAccessService.currentUser();
        return ResponseEntity.ok(gitHubService.connectRepository(projectId, request, currentUser));
    }

    @DeleteMapping("/projects/{projectId}/disconnect")
    public ResponseEntity<Void> disconnect(@PathVariable Long projectId) {
        User currentUser = projectAccessService.currentUser();
        gitHubService.disconnectRepository(projectId, currentUser);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/projects/{projectId}/integration")
    public ResponseEntity<GitHubIntegrationDTO> integration(@PathVariable Long projectId) {
        assertProjectAccess(projectId);
        return gitHubService.getIntegration(projectId)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.noContent().build());
    }

    @PostMapping("/projects/{projectId}/sync")
    public ResponseEntity<SyncResponse> sync(@PathVariable Long projectId) {
        User currentUser = projectAccessService.currentUser();
        int synced = gitHubService.syncIssues(projectId, currentUser);
        return ResponseEntity.ok(new SyncResponse(synced));
    }

    @GetMapping("/projects/{projectId}/pull-requests")
    public ResponseEntity<List<GitHubPullRequestDTO>> pullRequests(@PathVariable Long projectId) {
        assertProjectAccess(projectId);
        return ResponseEntity.ok(gitHubService.getPullRequests(projectId));
    }

    @GetMapping("/projects/{projectId}/commits")
    public ResponseEntity<List<GitHubCommitDTO>> commits(@PathVariable Long projectId) {
        assertProjectAccess(projectId);
        return ResponseEntity.ok(gitHubService.getRecentCommits(projectId));
    }

    @GetMapping("/tasks/{taskId}/commits")
    public ResponseEntity<List<GitHubCommitDTO>> taskCommits(@PathVariable Long taskId) {
        assertTaskAccess(taskId);
        return ResponseEntity.ok(gitHubService.getCommitsForTask(taskId));
    }

    @GetMapping("/projects/{projectId}/branches")
    public ResponseEntity<List<String>> repoBranches(@PathVariable Long projectId) {
        assertProjectAccess(projectId);
        return ResponseEntity.ok(gitHubService.getRepoBranches(projectId));
    }

    @GetMapping("/projects/{projectId}/development")
    public ResponseEntity<ProjectDevelopmentDTO> development(
            @PathVariable Long projectId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        assertProjectAccess(projectId);
        return ResponseEntity.ok(gitHubService.getProjectDevelopment(projectId, page, size));
    }

    @GetMapping("/tasks/{taskId}/development-panel")
    public ResponseEntity<DevelopmentPanelDTO> taskDevelopmentPanel(@PathVariable Long taskId) {
        assertTaskAccess(taskId);
        return ResponseEntity.ok(gitHubService.getTaskDevelopmentPanel(taskId));
    }

    @GetMapping("/tasks/{taskId}/branches")
    public ResponseEntity<List<BranchDTO>> taskBranches(@PathVariable Long taskId) {
        assertTaskAccess(taskId);
        return ResponseEntity.ok(gitHubService.getTaskBranches(taskId));
    }

    @PostMapping("/tasks/{taskId}/create-branch")
    public ResponseEntity<BranchDTO> createBranch(
            @PathVariable Long taskId,
            @RequestBody CreateBranchRequest request
    ) {
        User currentUser = projectAccessService.currentUser();
        return ResponseEntity.ok(gitHubService.createBranchForTask(taskId, request.branchName(), request.fromBranch(), currentUser.getId()));
    }

    @PostMapping("/tasks/{taskId}/create-pull-request")
    public ResponseEntity<GitHubPullRequestDTO> createPullRequest(
            @PathVariable Long taskId,
            @RequestBody CreatePullRequestRequest request
    ) {
        User currentUser = projectAccessService.currentUser();
        return ResponseEntity.ok(gitHubService.createPullRequestForTask(taskId, request, currentUser.getId()));
    }

    @GetMapping("/tasks/{taskId}/suggest-branch-name")
    public ResponseEntity<Map<String, String>> suggestBranchName(@PathVariable Long taskId) {
        assertTaskAccess(taskId);
        return ResponseEntity.ok(Map.of("branchName", gitHubService.suggestBranchName(taskId)));
    }

    @PostMapping("/webhook/{projectId}")
    public ResponseEntity<Void> webhook(
            @PathVariable Long projectId,
            @RequestHeader(value = "X-GitHub-Event", required = false) String eventType,
            @RequestHeader(value = "X-Hub-Signature-256", required = false) String signature,
            @RequestBody String payload
    ) {
        gitHubService.processWebhookEvent(eventType, payload, signature, projectId);
        return ResponseEntity.ok().build();
    }

    private void assertProjectAccess(Long projectId) {
        User currentUser = projectAccessService.currentUser();
        Project project = projectAccessService.getProjectOrThrow(projectId);
        projectAccessService.assertProjectAccess(currentUser, project);
    }

    private void assertTaskAccess(Long taskId) {
        Task task = taskRepository.findById(taskId)
                .orElseThrow(() -> new ResourceNotFoundException("Tache introuvable"));
        Project project = resolveProject(task);
        if (project == null) {
            throw new ResourceNotFoundException("Projet de la tache introuvable");
        }
        projectAccessService.assertProjectAccess(projectAccessService.currentUser(), project);
    }

    private Project resolveProject(Task task) {
        if (task.getProject() != null) return task.getProject();
        if (task.getSprint() != null) return task.getSprint().getProject();
        if (task.getStory() != null && task.getStory().getBacklog() != null) return task.getStory().getBacklog().getProject();
        return null;
    }

    public record SyncResponse(int synced) {
    }
}
