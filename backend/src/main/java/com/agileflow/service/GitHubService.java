package com.agileflow.service;

import com.agileflow.dto.*;
import com.agileflow.entity.*;
import com.agileflow.exception.*;
import com.agileflow.repository.*;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.HttpStatusCodeException;
import org.springframework.web.client.RestTemplate;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.text.Normalizer;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.net.URLEncoder;

@Service
@RequiredArgsConstructor
public class GitHubService {

    private static final Pattern TASK_REF_PATTERN = Pattern.compile("(?i)(?:#|[A-Z][A-Z0-9]{1,9}-|task/)(\\d+)");
    private static final Pattern MERGE_PR_PATTERN = Pattern.compile("(?i)merge\\s+pull\\s+request\\s+#(\\d+)");
    private static final Pattern BRANCH_TASK_PATTERN = Pattern.compile("(?i)(?:feature/|fix/|hotfix/|bugfix/|task/)?[A-Z][A-Z0-9]{1,9}-(\\d+)|(?:feature/|fix/|hotfix/|bugfix/|task/)(\\d+)");
    private static final Pattern CLOSING_COMMIT_PATTERN = Pattern.compile("(?i).*\\b(closes?|closed|fixes?|fixed|resolves?)\\s+(?:[A-Z][A-Z0-9]{1,9}-|#|task/)(\\d+).*");
    private static final String HMAC_ALGORITHM = "HmacSHA256";

    private final GitHubIntegrationRepository integrationRepository;
    private final ProjectRepository projectRepository;
    private final TaskRepository taskRepository;
    private final ActivityLogRepository activityLogRepository;
    private final NotificationRepository notificationRepository;
    private final GitHubTaskBranchRepository gitHubTaskBranchRepository;
    private final ProjectAccessService projectAccessService;
    private final ObjectMapper objectMapper;
    private final RestTemplate restTemplate = new RestTemplate();

    @Value("${github.api.base-url:https://api.github.com}")
    private String githubApiBaseUrl;

    @Value("${github.webhook.base-url:${app.frontend-url:http://localhost:5173}}")
    private String webhookBaseUrl;

    @Transactional
    public GitHubIntegrationDTO connectRepository(Long projectId, GitHubConnectRequest request, User currentUser) {
        Project project = getProject(projectId);
        projectAccessService.assertCanEditProjectContent(currentUser, project);
        validateRepository(request.repoOwner(), request.repoName(), request.accessToken());

        GitHubIntegration integration = integrationRepository.findByProject_Id(projectId).orElseGet(GitHubIntegration::new);
        integration.setProject(project);
        integration.setRepoOwner(request.repoOwner().trim());
        integration.setRepoName(request.repoName().trim());
        integration.setAccessToken(request.accessToken().trim());
        integration.setWebhookSecret(generateSecret());
        integration.setSyncIssues(true);
        integration.setSyncPrs(true);
        integration.setSyncCommits(true);

        Long webhookId = createWebhook(integration);
        integration.setWebhookId(webhookId);

        return toDto(integrationRepository.save(integration));
    }

    @Transactional
    public void disconnectRepository(Long projectId, User currentUser) {
        Project project = getProject(projectId);
        projectAccessService.assertCanEditProjectContent(currentUser, project);
        GitHubIntegration integration = getIntegrationEntity(projectId);
        deleteWebhook(integration);
        integrationRepository.delete(integration);
    }

    @Transactional(readOnly = true)
    public Optional<GitHubIntegrationDTO> getIntegration(Long projectId) {
        return integrationRepository.findByProject_Id(projectId).map(this::toDto);
    }

    @Transactional
    public int syncIssues(Long projectId, User currentUser) {
        Project project = getProject(projectId);
        projectAccessService.assertCanEditProjectContent(currentUser, project);
        GitHubIntegration integration = getIntegrationEntity(projectId);
        int synced = 0;

        if (integration.isSyncIssues()) {
            JsonNode issues = githubGet(integration, "/repos/%s/%s/issues?state=all&per_page=100".formatted(integration.getRepoOwner(), integration.getRepoName()));
            for (JsonNode issue : issues) {
                if (issue.hasNonNull("pull_request")) continue;
                upsertIssue(project, currentUser, issue);
                synced++;
            }
        }
        if (integration.isSyncPrs()) {
            synced += syncPullRequests(integration, project);
        }
        integration.setLastSyncedAt(LocalDateTime.now());
        integrationRepository.save(integration);
        return synced;
    }

    @Transactional(readOnly = true)
    public List<GitHubPullRequestDTO> getPullRequests(Long projectId) {
        GitHubIntegration integration = getIntegrationEntity(projectId);
        if (!integration.isSyncPrs()) return List.of();
        return getProjectPullRequests(projectId).stream()
                .filter(pr -> "open".equals(pr.state()))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<GitHubCommitDTO> getRecentCommits(Long projectId) {
        GitHubIntegration integration = getIntegrationEntity(projectId);
        if (!integration.isSyncCommits()) return List.of();
        return fetchRecentCommitsIncludingPullRequests(integration).stream()
                .limit(30)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<GitHubCommitDTO> getCommitsForTask(Long taskId) {
        Task task = taskRepository.findById(taskId)
                .orElseThrow(() -> new ResourceNotFoundException("Tache introuvable"));
        Project project = resolveProject(task);
        if (project == null) return List.of();
        GitHubIntegration integration = getIntegrationEntity(project.getId());
        if (!integration.isSyncCommits()) return List.of();
        return fetchRecentCommitsIncludingPullRequests(integration).stream()
                .filter(commit -> commit.mentionedTaskIds().contains(taskId)
                        || Objects.equals(task.getGithubPrNumber(), findPullRequestNumberFromCommitMessage(commit.message())))
                .limit(30)
                .toList();
    }

    @Transactional(readOnly = true)
    public String suggestBranchName(Long taskId) {
        Task task = taskRepository.findById(taskId)
                .orElseThrow(() -> new ResourceNotFoundException("Tache introuvable"));
        String slug = slugify(task.getTitre());
        return "feature/" + issueKey(task) + (slug.isBlank() ? "" : "-" + slug);
    }

    @Transactional
    public BranchDTO createBranchForTask(Long taskId, String branchName, String fromBranch, Long currentUserId) {
        Task task = taskRepository.findById(taskId)
                .orElseThrow(() -> new ResourceNotFoundException("Tache introuvable"));
        Project project = resolveProject(task);
        if (project == null) {
            throw new ResourceNotFoundException("Projet de la tache introuvable");
        }
        projectAccessService.assertCanEditProjectContent(projectAccessService.currentUser(), project);
        GitHubIntegration integration = getIntegrationEntity(project.getId());

        String normalizedBranchName = branchName != null ? branchName.trim() : "";
        if (normalizedBranchName.isBlank() || normalizedBranchName.contains(" ")) {
            throw new IllegalArgumentException("Nom de branche invalide");
        }
        String baseBranch = fromBranch == null || fromBranch.isBlank() ? "main" : fromBranch.trim();
        if (branchExists(integration, normalizedBranchName)) {
            throw new IllegalArgumentException("La branche '" + normalizedBranchName + "' existe deja sur GitHub");
        }

        try {
            String sha = getBranchSha(integration, baseBranch, "Branche de base introuvable: " + baseBranch);
            Map<String, String> body = Map.of(
                    "ref", "refs/heads/" + normalizedBranchName,
                    "sha", sha
            );
            githubExchange(integration, HttpMethod.POST, "/repos/%s/%s/git/refs".formatted(
                    integration.getRepoOwner(),
                    integration.getRepoName()
            ), body);

            saveTaskBranchIfNotExists(task, normalizedBranchName, sha);
            if (task.getStatut() == Task.Statut.TODO) {
                task.setStatut(Task.Statut.IN_PROGRESS);
                taskRepository.save(task);
            }
            log(project.getManager(), project, task, ActivityLog.Action.GITHUB_BRANCH_CREATED,
                    "Branche GitHub creee: " + normalizedBranchName + " -> IN_PROGRESS");
            return new BranchDTO(normalizedBranchName, sha, task.getId(), LocalDateTime.now());
        } catch (IllegalArgumentException ex) {
            throw new IllegalArgumentException(toFrenchGitHubWriteError(ex.getMessage(), "Impossible de creer la branche GitHub"));
        } catch (GitHubRepositoryNotFoundException ex) {
            throw new IllegalStateException("Token GitHub invalide ou depot inaccessible. Reconnectez le depot.");
        }
    }

    @Transactional
    public GitHubPullRequestDTO createPullRequestForTask(Long taskId, CreatePullRequestRequest request, Long currentUserId) {
        Task task = taskRepository.findById(taskId)
                .orElseThrow(() -> new ResourceNotFoundException("Tache introuvable"));
        Project project = resolveProject(task);
        if (project == null) {
            throw new ResourceNotFoundException("Projet de la tache introuvable");
        }
        projectAccessService.assertCanEditProjectContent(projectAccessService.currentUser(), project);
        GitHubIntegration integration = getIntegrationEntity(project.getId());

        String headBranch = request.headBranch() != null ? request.headBranch().trim() : "";
        String baseBranch = request.baseBranch() == null || request.baseBranch().isBlank() ? "main" : request.baseBranch().trim();
        String title = request.title() == null || request.title().isBlank()
                ? issueKey(task) + " " + task.getTitre()
                : request.title().trim();
        String body = request.body() == null || request.body().isBlank()
                ? "Liee a la tache " + issueKey(task)
                : request.body().trim();
        if (headBranch.isBlank() || headBranch.contains(" ")) {
            throw new IllegalArgumentException("Branche source invalide");
        }
        if (headBranch.equals(baseBranch)) {
            throw new IllegalArgumentException("La branche source doit etre differente de la branche cible");
        }
        getBranchSha(integration, headBranch, "Branche source introuvable: " + headBranch);
        getBranchSha(integration, baseBranch, "Branche cible introuvable: " + baseBranch);
        if (openPullRequestExists(integration, headBranch, baseBranch)) {
            throw new IllegalArgumentException("Une pull request ouverte existe deja entre " + headBranch + " et " + baseBranch);
        }

        Map<String, String> payload = new LinkedHashMap<>();
        payload.put("title", title);
        payload.put("head", headBranch);
        payload.put("base", baseBranch);
        payload.put("body", body);

        try {
            JsonNode pr = githubExchange(integration, HttpMethod.POST, "/repos/%s/%s/pulls".formatted(
                    integration.getRepoOwner(),
                    integration.getRepoName()
            ), payload);
            linkPullRequestToTask(integration, task, pr, false);
            task.setStatut(Task.Statut.REVIEW);
            taskRepository.save(task);
            saveTaskBranchIfNotExists(task, headBranch, pr.path("head").path("sha").asText(""));
            log(project.getManager(), project, task, ActivityLog.Action.GITHUB_PR_OPENED,
                    "PR GitHub creee: #" + pr.path("number").asInt() + " -> REVIEW");
            notifyAssignee(task, "Pull request GitHub creee pour la tache " + issueKey(task));
            return toPullRequestDto(integration, pr);
        } catch (IllegalArgumentException ex) {
            throw new IllegalArgumentException(toFrenchGitHubWriteError(ex.getMessage(), "Impossible de creer la PR GitHub"));
        } catch (GitHubRepositoryNotFoundException ex) {
            throw new IllegalStateException("Token GitHub invalide ou depot inaccessible. Reconnectez le depot.");
        }
    }

    @Transactional(readOnly = true)
    public List<String> getRepoBranches(Long projectId) {
        GitHubIntegration integration = getIntegrationEntity(projectId);
        try {
            JsonNode response = githubGet(integration, "/repos/%s/%s/branches?per_page=50".formatted(
                    integration.getRepoOwner(),
                    integration.getRepoName()
            ));
            List<String> branches = new ArrayList<>();
            response.forEach(node -> branches.add(node.path("name").asText()));
            return branches.isEmpty() ? List.of("main", "develop") : branches;
        } catch (RuntimeException ex) {
            return List.of("main", "develop");
        }
    }

    @Transactional(readOnly = true)
    public List<BranchDTO> getTaskBranches(Long taskId) {
        return gitHubTaskBranchRepository.findByTask_Id(taskId).stream()
                .map(branch -> new BranchDTO(branch.getBranchName(), branch.getSha(), taskId, branch.getCreatedAt()))
                .toList();
    }

    @Transactional(readOnly = true)
    public DevelopmentPanelDTO getTaskDevelopmentPanel(Long taskId) {
        Task task = taskRepository.findById(taskId)
                .orElseThrow(() -> new ResourceNotFoundException("Tache introuvable"));
        Project project = resolveProject(task);
        List<BranchDTO> branches = getTaskBranches(taskId);
        List<GitHubCommitDTO> commits = List.of();
        List<GitHubPullRequestDTO> prs = List.of();
        if (project != null) {
            try {
                commits = getCommitsForTask(taskId);
            } catch (RuntimeException ignored) {
                // Le panel reste utilisable meme si l'API GitHub est temporairement indisponible.
            }
            try {
                prs = getProjectPullRequests(project.getId()).stream()
                        .filter(pr -> Objects.equals(pr.linkedTaskId(), taskId)
                                || Objects.equals(task.getGithubPrNumber(), pr.number()))
                        .toList();
                branches = mergeBranches(branches, prs);
            } catch (RuntimeException ignored) {
                // Meme logique : on affiche le reste du panel au lieu de bloquer l'UI.
            }
        }
        return new DevelopmentPanelDTO(taskId, issuePrefix(project), task.getTitre(), name(task.getStatut()), branches, prs, commits);
    }

    @Transactional(readOnly = true)
    public ProjectDevelopmentDTO getProjectDevelopment(Long projectId, int page, int size) {
        Optional<GitHubIntegration> optionalIntegration = integrationRepository.findByProject_Id(projectId);
        if (optionalIntegration.isEmpty()) {
            Project project = projectRepository.findById(projectId).orElse(null);
            return new ProjectDevelopmentDTO(projectId, issuePrefix(project), null, false, List.of(), List.of(), List.of(), List.of(), 0, 0, 0, 0, page, size, 0);
        }
        GitHubIntegration integration = optionalIntegration.get();
        Project project = integration.getProject();
        List<GitHubPullRequestDTO> allPrs = getProjectPullRequests(projectId);
        List<GitHubPullRequestDTO> openPrs = allPrs.stream().filter(pr -> "open".equals(pr.state())).toList();
        List<GitHubPullRequestDTO> mergedPrs = allPrs.stream().filter(GitHubPullRequestDTO::merged).toList();
        List<BranchDTO> storedBranches = gitHubTaskBranchRepository.findByTaskProjectId(projectId).stream()
                .map(branch -> new BranchDTO(branch.getBranchName(), branch.getSha(), branch.getTask().getId(), branch.getCreatedAt()))
                .toList();
        List<BranchDTO> branches = mergeBranches(storedBranches, allPrs);
        List<GitHubCommitDTO> commits = integration.isSyncCommits()
                ? fetchRecentCommitsIncludingPullRequests(integration).stream().limit(20).toList()
                : List.of();
        int safeSize = Math.max(size, 1);
        int fromIndex = Math.max(page, 0) * safeSize;
        List<GitHubPullRequestDTO> pagedOpenPrs = openPrs.stream().skip(fromIndex).limit(safeSize).toList();
        int totalPages = (int) Math.ceil((double) openPrs.size() / safeSize);
        int failingChecks = (int) allPrs.stream().filter(pr -> "failure".equals(pr.checksStatus())).count();
        return new ProjectDevelopmentDTO(
                projectId,
                issuePrefix(project),
                repoFullName(integration),
                true,
                pagedOpenPrs,
                mergedPrs.stream().limit(20).toList(),
                branches,
                commits,
                openPrs.size(),
                mergedPrs.size(),
                branches.size(),
                failingChecks,
                Math.max(page, 0),
                safeSize,
                totalPages
        );
    }

    @Transactional
    public void processWebhookEvent(String eventType, String payload, String signature, Long projectId) {
        GitHubIntegration integration = getIntegrationEntity(projectId);
        if (!isValidSignature(payload, signature, integration.getWebhookSecret())) {
            throw new GitHubWebhookSignatureException("Signature GitHub invalide");
        }

        try {
            JsonNode root = objectMapper.readTree(payload);
            switch (eventType) {
                case "issues" -> processIssueWebhook(integration, root);
                case "pull_request" -> processPullRequestWebhook(integration, root);
                case "push" -> processPushWebhook(integration, root);
                case "create" -> processCreateWebhook(integration, root);
                default -> {
                    // Evenement GitHub ignore volontairement.
                }
            }
        } catch (GitHubWebhookSignatureException ex) {
            throw ex;
        } catch (Exception ex) {
            throw new GitHubApiException("Impossible de traiter le webhook GitHub");
        }
    }

    private void processIssueWebhook(GitHubIntegration integration, JsonNode root) {
        if (!integration.isSyncIssues()) return;
        String action = text(root, "action");
        JsonNode issue = root.path("issue");
        Project project = integration.getProject();
        User actor = project.getManager();
        if ("opened".equals(action)) {
            upsertIssue(project, actor, issue);
        } else if ("closed".equals(action) || "reopened".equals(action)) {
            Integer number = issue.path("number").asInt();
            taskRepository.findByProject_IdAndGithubIssueNumber(project.getId(), number).ifPresent(task -> {
                task.setStatut("closed".equals(action) ? Task.Statut.DONE : Task.Statut.TODO);
                taskRepository.save(task);
            });
        }
    }

    private void processPullRequestWebhook(GitHubIntegration integration, JsonNode root) {
        if (!integration.isSyncPrs()) return;
        String action = text(root, "action");
        JsonNode pr = root.path("pull_request");
        Project project = integration.getProject();
        Optional<Task> task = findMentionedTask(project.getId(), text(pr, "title") + " " + pr.path("head").path("ref").asText(""));

        if (("opened".equals(action) || "synchronize".equals(action)) && task.isPresent()) {
            Task target = task.get();
            linkPullRequestToTask(integration, target, pr, false);
            if ("opened".equals(action)) {
                target.setStatut(Task.Statut.REVIEW);
                taskRepository.save(target);
                log(project.getManager(), project, target, ActivityLog.Action.GITHUB_PR_OPENED,
                        "PR GitHub ouverte: #" + pr.path("number").asInt() + " -> REVIEW");
            }
            notifyAssignee(target, "Pull request GitHub liee a la tache " + issueKey(target));
        }

        if ("closed".equals(action) && pr.path("merged").asBoolean(false)) {
            Optional<Task> linked = taskRepository.findByGithubPrNumber(pr.path("number").asInt()).or(() -> task);
            linked.ifPresent(target -> {
                linkPullRequestToTask(integration, target, pr, true);
                log(project.getManager(), project, target, ActivityLog.Action.GITHUB_PR_MERGED,
                        "PR GitHub mergee: #" + pr.path("number").asInt() + " - " + text(pr, "title"));
            });
        } else if ("closed".equals(action)) {
            Optional<Task> linked = taskRepository.findByGithubPrNumber(pr.path("number").asInt()).or(() -> task);
            linked.ifPresent(target -> {
                target.setStatut(Task.Statut.IN_PROGRESS);
                taskRepository.save(target);
                log(project.getManager(), project, target, ActivityLog.Action.GITHUB_PR_CLOSED,
                        "PR GitHub fermee sans merge: #" + pr.path("number").asInt() + " -> IN_PROGRESS");
            });
        }
    }

    private void processPushWebhook(GitHubIntegration integration, JsonNode root) {
        if (!integration.isSyncCommits()) return;
        Project project = integration.getProject();
        String branchName = root.path("ref").asText("").replace("refs/heads/", "");
        String headSha = root.path("head_commit").path("id").asText("");
        extractTaskIdFromBranchName(branchName).ifPresent(taskId ->
                taskRepository.findById(taskId).ifPresent(task -> saveTaskBranchIfNotExists(task, branchName, headSha))
        );
        for (JsonNode commit : root.path("commits")) {
            String message = text(commit, "message");
            for (Long taskId : extractTaskIds(message)) {
                taskRepository.findById(taskId).ifPresent(task -> {
                    linkMergedPullRequestFromCommit(integration, task, message);
                    log(project.getManager(), project, task, ActivityLog.Action.GITHUB_COMMIT,
                            "Commit GitHub " + shortSha(text(commit, "id")) + ": " + message);
                });
            }
            if (isClosingCommit(message)) {
                for (Long taskId : extractTaskIdsFromCommitMessage(message)) {
                    taskRepository.findById(taskId).ifPresent(task -> {
                        task.setStatut(Task.Statut.DONE);
                        taskRepository.save(task);
                        log(project.getManager(), project, task, ActivityLog.Action.GITHUB_COMMIT_CLOSES,
                                "Commit GitHub cloture la tache: " + truncate(message, 80) + " -> DONE");
                    });
                }
            }
        }
    }

    private void processCreateWebhook(GitHubIntegration integration, JsonNode root) {
        if (!"branch".equals(text(root, "ref_type"))) return;
        String branchName = text(root, "ref");
        if (branchName == null || branchName.isBlank()) return;
        Project project = integration.getProject();
        extractTaskIdFromBranchName(branchName).ifPresent(taskId ->
                taskRepository.findById(taskId).ifPresent(task -> {
                    saveTaskBranchIfNotExists(task, branchName, root.path("master_branch").asText(""));
                    if (task.getStatut() == Task.Statut.TODO) {
                        task.setStatut(Task.Statut.IN_PROGRESS);
                        taskRepository.save(task);
                    }
                    log(project.getManager(), project, task, ActivityLog.Action.GITHUB_BRANCH_CREATED,
                            "Branche GitHub creee via webhook: " + branchName + " -> IN_PROGRESS");
                })
        );
    }

    private void linkMergedPullRequestFromCommit(GitHubIntegration integration, Task task, String message) {
        Matcher matcher = MERGE_PR_PATTERN.matcher(message == null ? "" : message);
        if (!matcher.find()) return;

        int prNumber = Integer.parseInt(matcher.group(1));
        Project project = integration.getProject();
        String prUrl = pullRequestUrl(integration, prNumber);
        task.setGithubPrNumber(prNumber);
        task.setGithubPrUrl(prUrl);
        task.setStatut(Task.Statut.DONE);
        taskRepository.save(task);
        mirrorPullRequestOnVisibleParent(task, prNumber, prUrl);
        log(project.getManager(), project, task, ActivityLog.Action.GITHUB_PR_MERGED,
                "PR GitHub mergee: #" + prNumber + " depuis un commit de merge");
    }

    private int syncPullRequests(GitHubIntegration integration, Project project) {
        JsonNode prs = githubGet(integration, "/repos/%s/%s/pulls?state=all&per_page=100".formatted(
                integration.getRepoOwner(),
                integration.getRepoName()
        ));
        int linked = 0;
        for (JsonNode pr : prs) {
            String searchable = (text(pr, "title") != null ? text(pr, "title") : "")
                    + " " + pr.path("head").path("ref").asText("");
            Optional<Task> task = findMentionedTask(project.getId(), searchable);
            if (task.isPresent()) {
                boolean merged = isMergedPullRequest(pr);
                linkPullRequestToTask(integration, task.get(), pr, merged);
                saveTaskBranchIfNotExists(
                        task.get(),
                        pr.path("head").path("ref").asText(""),
                        pr.path("head").path("sha").asText("")
                );
                linked++;
            }
        }
        return linked;
    }

    private List<GitHubPullRequestDTO> getProjectPullRequests(Long projectId) {
        GitHubIntegration integration = getIntegrationEntity(projectId);
        if (!integration.isSyncPrs()) return List.of();
        JsonNode prs = githubGet(integration, "/repos/%s/%s/pulls?state=all&per_page=100".formatted(
                integration.getRepoOwner(),
                integration.getRepoName()
        ));
        List<GitHubPullRequestDTO> rows = new ArrayList<>();
        int enriched = 0;
        for (JsonNode pr : prs) {
            JsonNode detailed = pr;
            if (enriched < 10) {
                detailed = githubGet(integration, "/repos/%s/%s/pulls/%d".formatted(
                        integration.getRepoOwner(),
                        integration.getRepoName(),
                        pr.path("number").asInt()
                ));
                enriched++;
            }
            rows.add(toPullRequestDto(integration, detailed));
        }
        return rows;
    }

    private List<GitHubCommitDTO> fetchRecentCommitsIncludingPullRequests(GitHubIntegration integration) {
        Map<String, GitHubCommitDTO> commitsBySha = new LinkedHashMap<>();
        JsonNode commits = githubGet(integration, "/repos/%s/%s/commits?per_page=30".formatted(
                integration.getRepoOwner(),
                integration.getRepoName()
        ));
        for (JsonNode commit : commits) {
            GitHubCommitDTO dto = toCommitDto(commit);
            commitsBySha.putIfAbsent(dto.sha(), dto);
        }

        if (integration.isSyncPrs()) {
            JsonNode prs = githubGet(integration, "/repos/%s/%s/pulls?state=all&per_page=30".formatted(
                    integration.getRepoOwner(),
                    integration.getRepoName()
            ));
            for (JsonNode pr : prs) {
                int prNumber = pr.path("number").asInt();
                try {
                    JsonNode prCommits = githubGet(integration, "/repos/%s/%s/pulls/%d/commits?per_page=30".formatted(
                            integration.getRepoOwner(),
                            integration.getRepoName(),
                            prNumber
                    ));
                    for (JsonNode commit : prCommits) {
                        GitHubCommitDTO dto = toCommitDto(commit);
                        commitsBySha.putIfAbsent(dto.sha(), dto);
                    }
                } catch (RuntimeException ignored) {
                    // Une PR inaccessible ne doit pas bloquer les commits de la branche principale.
                }
            }
        }

        return commitsBySha.values().stream()
                .sorted(Comparator.comparing(GitHubCommitDTO::committedAt, Comparator.nullsLast(Comparator.reverseOrder())))
                .toList();
    }

    private String resolveChecksStatus(GitHubIntegration integration, String headSha) {
        if (headSha == null || headSha.isBlank()) return "unknown";
        try {
            JsonNode response = githubGet(integration, "/repos/%s/%s/commits/%s/check-runs".formatted(
                    integration.getRepoOwner(),
                    integration.getRepoName(),
                    headSha
            ));
            JsonNode runs = response.path("check_runs");
            if (!runs.isArray() || runs.isEmpty()) return "unknown";
            boolean pending = false;
            boolean success = true;
            for (JsonNode run : runs) {
                String conclusion = run.path("conclusion").asText("");
                String status = run.path("status").asText("");
                if ("failure".equals(conclusion) || "cancelled".equals(conclusion) || "timed_out".equals(conclusion)) {
                    return "failure";
                }
                if ("in_progress".equals(status) || "queued".equals(status) || conclusion.isBlank() || "null".equals(conclusion)) {
                    pending = true;
                    success = false;
                } else if (!"success".equals(conclusion) && !"neutral".equals(conclusion) && !"skipped".equals(conclusion)) {
                    success = false;
                }
            }
            if (pending) return "pending";
            return success ? "success" : "unknown";
        } catch (RuntimeException ex) {
            return "unknown";
        }
    }

    private void linkPullRequestToTask(GitHubIntegration integration, Task task, JsonNode pr, boolean markDone) {
        int prNumber = pr.path("number").asInt();
        String prUrl = text(pr, "html_url");
        if (prUrl == null || prUrl.isBlank()) {
            prUrl = pullRequestUrl(integration, prNumber);
        }
        task.setGithubPrNumber(prNumber);
        task.setGithubPrUrl(prUrl);
        if (markDone) {
            task.setStatut(Task.Statut.DONE);
        }
        taskRepository.save(task);
        mirrorPullRequestOnVisibleParent(task, prNumber, prUrl);
    }

    private Integer findPullRequestNumberFromCommitMessage(String message) {
        Matcher matcher = MERGE_PR_PATTERN.matcher(message == null ? "" : message);
        return matcher.find() ? Integer.parseInt(matcher.group(1)) : null;
    }

    private String slugify(String input) {
        if (input == null) return "";
        String withoutAccents = Normalizer.normalize(input, Normalizer.Form.NFD)
                .replaceAll("\\p{InCombiningDiacriticalMarks}+", "");
        String slug = withoutAccents.toLowerCase(Locale.ROOT)
                .replaceAll("[^a-z0-9]+", "-")
                .replaceAll("^-|-$", "");
        return slug.length() > 50 ? slug.substring(0, 50).replaceAll("-$", "") : slug;
    }

    private Optional<Long> extractTaskIdFromBranchName(String branchName) {
        Matcher matcher = BRANCH_TASK_PATTERN.matcher(branchName == null ? "" : branchName);
        if (!matcher.find()) return Optional.empty();
        String id = matcher.group(1) != null ? matcher.group(1) : matcher.group(2);
        return Optional.of(Long.parseLong(id));
    }

    private List<Long> extractTaskIdsFromCommitMessage(String message) {
        if (message == null) return List.of();
        List<Long> ids = new ArrayList<>();
        Matcher matcher = Pattern.compile("(?i)(?:closes?|closed|fixes?|fixed|resolves?)?\\s*(?:[A-Z][A-Z0-9]{1,9}-|#|task/)(\\d+)").matcher(message);
        while (matcher.find()) {
            ids.add(Long.parseLong(matcher.group(1)));
        }
        return ids.stream().distinct().toList();
    }

    private boolean isClosingCommit(String message) {
        return CLOSING_COMMIT_PATTERN.matcher(message == null ? "" : message).matches();
    }

    private void saveTaskBranchIfNotExists(Task task, String branchName, String sha) {
        if (branchName == null || branchName.isBlank()) return;
        if (!gitHubTaskBranchRepository.existsByTask_IdAndBranchName(task.getId(), branchName)) {
            gitHubTaskBranchRepository.save(GitHubTaskBranch.builder()
                    .task(task)
                    .branchName(branchName)
                    .sha(sha)
                    .build());
        }
    }

    private List<BranchDTO> mergeBranches(List<BranchDTO> storedBranches, List<GitHubPullRequestDTO> pullRequests) {
        Map<String, BranchDTO> branchesByName = new LinkedHashMap<>();
        for (BranchDTO branch : storedBranches) {
            if (branch.name() != null && !branch.name().isBlank()) {
                branchesByName.put(branch.name(), branch);
            }
        }
        for (GitHubPullRequestDTO pr : pullRequests) {
            if (pr.linkedTaskId() == null || pr.headBranch() == null || pr.headBranch().isBlank()) continue;
            branchesByName.putIfAbsent(
                    pr.headBranch(),
                    new BranchDTO(pr.headBranch(), null, pr.linkedTaskId(), pr.createdAt())
            );
        }
        return new ArrayList<>(branchesByName.values());
    }

    private void mirrorPullRequestOnVisibleParent(Task task, int prNumber, String prUrl) {
        if (task.getTypeTache() != TypeTache.SUBTASK || task.getParentTask() == null) return;
        Task parent = task.getParentTask();
        parent.setGithubPrNumber(prNumber);
        parent.setGithubPrUrl(prUrl);
        taskRepository.save(parent);
    }

    private boolean isMergedPullRequest(JsonNode pr) {
        return pr.path("merged").asBoolean(false)
                || (pr.has("merged_at") && !pr.path("merged_at").isNull() && !pr.path("merged_at").asText("").isBlank());
    }

    private String pullRequestUrl(GitHubIntegration integration, int prNumber) {
        return "https://github.com/%s/%s/pull/%d".formatted(
                integration.getRepoOwner(),
                integration.getRepoName(),
                prNumber
        );
    }

    private Task upsertIssue(Project project, User actor, JsonNode issue) {
        Integer issueNumber = issue.path("number").asInt();
        Task task = taskRepository.findByProject_IdAndGithubIssueNumber(project.getId(), issueNumber).orElseGet(Task::new);
        task.setProject(project);
        task.setAssignedBy(actor);
        task.setTitre(text(issue, "title"));
        task.setDescription(text(issue, "body"));
        task.setGithubIssueNumber(issueNumber);
        task.setGithubIssueUrl(text(issue, "html_url"));
        task.setStatut("closed".equals(text(issue, "state")) ? Task.Statut.DONE : Task.Statut.TODO);
        task.setTypeTache(resolveType(issue.path("labels")));
        task.setType(resolveLegacyType(task.getTypeTache()));
        if (task.getPriorite() == null) task.setPriorite(Task.Priorite.MEDIUM);
        return taskRepository.save(task);
    }

    private TypeTache resolveType(JsonNode labelsNode) {
        Set<String> labels = new HashSet<>();
        for (JsonNode label : labelsNode) {
            labels.add(text(label, "name").toLowerCase(Locale.ROOT));
        }
        if (labels.contains("epic")) return TypeTache.EPIC;
        if (labels.contains("bug")) return TypeTache.BUG;
        if (labels.contains("feature") || labels.contains("enhancement")) return TypeTache.FEATURE;
        return TypeTache.TASK;
    }

    private Task.Type resolveLegacyType(TypeTache typeTache) {
        return switch (typeTache) {
            case EPIC -> Task.Type.EPIC;
            case STORY -> Task.Type.STORY;
            case FEATURE -> Task.Type.FEATURE;
            case BUG -> Task.Type.BUG;
            default -> Task.Type.TASK;
        };
    }

    private Optional<Task> findMentionedTask(Long projectId, String text) {
        return extractTaskIds(text).stream()
                .map(taskRepository::findById)
                .flatMap(Optional::stream)
                .filter(task -> {
                    Project project = resolveProject(task);
                    return project != null && project.getId().equals(projectId);
                })
                .findFirst();
    }

    private List<Long> extractTaskIds(String value) {
        if (value == null) return List.of();
        List<Long> ids = new ArrayList<>();
        Matcher matcher = TASK_REF_PATTERN.matcher(value);
        while (matcher.find()) {
            ids.add(Long.parseLong(matcher.group(1)));
        }
        return ids.stream().distinct().toList();
    }

    private boolean isValidSignature(String payload, String signature, String secret) {
        if (signature == null || !signature.startsWith("sha256=")) return false;
        try {
            Mac mac = Mac.getInstance(HMAC_ALGORITHM);
            mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), HMAC_ALGORITHM));
            String expected = "sha256=" + bytesToHex(mac.doFinal(payload.getBytes(StandardCharsets.UTF_8)));
            return MessageDigest.isEqual(expected.getBytes(StandardCharsets.UTF_8), signature.getBytes(StandardCharsets.UTF_8));
        } catch (Exception ex) {
            return false;
        }
    }

    private void validateRepository(String owner, String repo, String token) {
        GitHubIntegration tmp = GitHubIntegration.builder()
                .repoOwner(owner)
                .repoName(repo)
                .accessToken(token)
                .webhookSecret("validation")
                .build();
        githubGet(tmp, "/repos/%s/%s".formatted(owner, repo));
    }

    private Long createWebhook(GitHubIntegration integration) {
        String url = "/repos/%s/%s/hooks".formatted(integration.getRepoOwner(), integration.getRepoName());
        Map<String, Object> body = Map.of(
                "name", "web",
                "active", true,
                "events", List.of("issues", "pull_request", "push", "create"),
                "config", Map.of(
                        "url", webhookBaseUrl.replaceAll("/$", "") + "/api/github/webhook/" + integration.getProject().getId(),
                        "content_type", "json",
                        "secret", integration.getWebhookSecret()
                )
        );
        try {
            JsonNode response = githubExchange(integration, HttpMethod.POST, url, body);
            return response.path("id").isNumber() ? response.path("id").asLong() : null;
        } catch (RuntimeException ex) {
            // En local, GitHub refuse souvent le webhook car l'URL n'est pas publique
            // ou parce que le token n'a pas admin:repo_hook. L'integration reste utile
            // pour la synchronisation manuelle, les PRs, les commits et la creation de branches.
            return null;
        }
    }

    private void deleteWebhook(GitHubIntegration integration) {
        if (integration.getWebhookId() == null) return;
        try {
            githubExchange(integration, HttpMethod.DELETE,
                    "/repos/%s/%s/hooks/%d".formatted(integration.getRepoOwner(), integration.getRepoName(), integration.getWebhookId()), null);
        } catch (GitHubApiException ignored) {
            // La suppression locale reste possible meme si le webhook distant n'existe plus.
        }
    }

    private JsonNode githubGet(GitHubIntegration integration, String path) {
        return githubExchange(integration, HttpMethod.GET, path, null);
    }

    private JsonNode githubExchange(GitHubIntegration integration, HttpMethod method, String path, Object body) {
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(integration.getAccessToken());
        headers.setAccept(List.of(MediaType.APPLICATION_JSON));
        headers.set("X-GitHub-Api-Version", "2022-11-28");
        HttpEntity<Object> entity = new HttpEntity<>(body, headers);
        try {
            ResponseEntity<JsonNode> response = restTemplate.exchange(githubApiBaseUrl + path, method, entity, JsonNode.class);
            return response.getBody() == null ? objectMapper.createObjectNode() : response.getBody();
        } catch (HttpClientErrorException.NotFound ex) {
            throw new GitHubRepositoryNotFoundException("Depot GitHub introuvable ou token invalide");
        } catch (HttpClientErrorException.Unauthorized ex) {
            throw new GitHubRepositoryNotFoundException("Token GitHub invalide");
        } catch (HttpClientErrorException.UnprocessableEntity ex) {
            throw new IllegalArgumentException(gitHubErrorMessage(ex, "La branche existe deja ou le nom de branche est invalide"));
        } catch (HttpClientErrorException.Forbidden ex) {
            throw new IllegalStateException("Token GitHub sans permission suffisante. Ajoutez l'acces Contents: Read and write au token.");
        } catch (HttpClientErrorException.BadRequest ex) {
            throw new IllegalArgumentException(gitHubErrorMessage(ex, "Requete GitHub invalide"));
        } catch (HttpStatusCodeException ex) {
            throw new GitHubApiException(gitHubErrorMessage(ex, "Erreur lors de l'appel a l'API GitHub"));
        } catch (Exception ex) {
            throw new GitHubApiException("Erreur lors de l'appel a l'API GitHub");
        }
    }

    private String gitHubErrorMessage(HttpStatusCodeException ex, String fallback) {
        try {
            JsonNode root = objectMapper.readTree(ex.getResponseBodyAsString());
            String message = root.path("message").asText("");
            JsonNode errors = root.path("errors");
            if (errors.isArray() && !errors.isEmpty()) {
                List<String> details = new ArrayList<>();
                for (JsonNode error : errors) {
                    String detail = error.path("message").asText("");
                    if (detail == null || detail.isBlank()) {
                        String field = error.path("field").asText("");
                        String code = error.path("code").asText("");
                        detail = (field + " " + code).trim();
                    }
                    if (detail != null && !detail.isBlank()) details.add(detail);
                }
                if (!details.isEmpty()) return message + ": " + String.join("; ", details);
            }
            if (message != null && !message.isBlank()) return message;
        } catch (Exception ignored) {
            // Le corps GitHub n'est pas toujours du JSON exploitable.
        }
        return fallback;
    }

    private String getBranchSha(GitHubIntegration integration, String branchName, String notFoundMessage) {
        try {
            JsonNode refResponse = githubGet(integration, "/repos/%s/%s/git/ref/heads/%s".formatted(
                    integration.getRepoOwner(),
                    integration.getRepoName(),
                    encodePath(branchName)
            ));
            String sha = refResponse.path("object").path("sha").asText("");
            if (sha.isBlank()) throw new IllegalArgumentException("SHA introuvable pour la branche: " + branchName);
            return sha;
        } catch (GitHubRepositoryNotFoundException ex) {
            throw new IllegalArgumentException(notFoundMessage);
        }
    }

    private boolean branchExists(GitHubIntegration integration, String branchName) {
        try {
            getBranchSha(integration, branchName, "");
            return true;
        } catch (IllegalArgumentException ex) {
            return false;
        }
    }

    private boolean openPullRequestExists(GitHubIntegration integration, String headBranch, String baseBranch) {
        JsonNode prs = githubGet(integration, "/repos/%s/%s/pulls?state=open&head=%s:%s&base=%s".formatted(
                integration.getRepoOwner(),
                integration.getRepoName(),
                encodeQuery(integration.getRepoOwner()),
                encodeQuery(headBranch),
                encodeQuery(baseBranch)
        ));
        return prs.isArray() && !prs.isEmpty();
    }

    private String toFrenchGitHubWriteError(String message, String fallback) {
        String raw = message == null ? "" : message;
        String lower = raw.toLowerCase(Locale.ROOT);
        if (lower.contains("reference already exists") || lower.contains("already_exists") || lower.contains("exists already")) {
            return "Cette branche existe deja sur GitHub.";
        }
        if (lower.contains("no commits between") || lower.contains("must be a branch") || lower.contains("head")) {
            return "Impossible de creer la PR: la branche source ne contient aucun commit different de la branche cible.";
        }
        if (lower.contains("pull request already exists") || lower.contains("a pull request already exists")) {
            return "Une pull request ouverte existe deja pour cette branche.";
        }
        if (lower.contains("base") && lower.contains("invalid")) {
            return "Branche cible invalide ou introuvable.";
        }
        if (lower.contains("validation failed")) {
            return fallback + ": GitHub a refuse la requete. Verifiez le nom de branche, les commits non merges et les permissions du token.";
        }
        return raw.isBlank() ? fallback : raw;
    }

    private String encodePath(String value) {
        return Arrays.stream((value == null ? "" : value).split("/"))
                .map(this::encodeQuery)
                .reduce((left, right) -> left + "/" + right)
                .orElse("");
    }

    private String encodeQuery(String value) {
        return URLEncoder.encode(value == null ? "" : value, StandardCharsets.UTF_8);
    }

    private GitHubPullRequestDTO toPullRequestDto(GitHubIntegration integration, JsonNode pr) {
        int number = pr.path("number").asInt();
        String htmlUrl = text(pr, "html_url");
        String headSha = pr.path("head").path("sha").asText("");
        Long linkedTaskId = findMentionedTask(integration.getProject().getId(), text(pr, "title") + " " + pr.path("head").path("ref").asText(""))
                .map(Task::getId)
                .orElseGet(() -> taskRepository.findByGithubPrNumber(number).map(Task::getId).orElse(null));
        return new GitHubPullRequestDTO(
                number,
                text(pr, "title"),
                text(pr, "state"),
                htmlUrl,
                htmlUrl,
                pr.path("head").path("ref").asText(""),
                pr.path("base").path("ref").asText(""),
                pr.path("user").path("login").asText(""),
                pr.path("user").path("avatar_url").asText(""),
                isMergedPullRequest(pr),
                parseDate(text(pr, "created_at")),
                parseDate(text(pr, "updated_at")),
                parseDate(text(pr, "merged_at")),
                pr.path("additions").asInt(0),
                pr.path("deletions").asInt(0),
                pr.path("changed_files").asInt(0),
                resolveChecksStatus(integration, headSha),
                linkedTaskId
        );
    }

    private GitHubCommitDTO toCommitDto(JsonNode commitRoot) {
        String sha = text(commitRoot, "sha");
        JsonNode commit = commitRoot.path("commit");
        String message = text(commit, "message");
        return new GitHubCommitDTO(
                sha,
                shortSha(sha),
                message,
                commitRoot.path("author").path("login").asText(commit.path("author").path("name").asText("")),
                commitRoot.path("author").path("avatar_url").asText(""),
                text(commitRoot, "html_url"),
                text(commitRoot, "html_url"),
                parseDate(commit.path("author").path("date").asText(null)),
                extractTaskIds(message),
                extractTaskIds(message).stream().findFirst().orElse(null)
        );
    }

    private GitHubIntegration getIntegrationEntity(Long projectId) {
        return integrationRepository.findByProject_Id(projectId)
                .orElseThrow(() -> new GitHubIntegrationNotFoundException("Aucune integration GitHub configuree"));
    }

    private Project getProject(Long projectId) {
        return projectRepository.findById(projectId)
                .orElseThrow(() -> new ResourceNotFoundException("Projet introuvable"));
    }

    private Project resolveProject(Task task) {
        if (task.getProject() != null) return task.getProject();
        if (task.getSprint() != null) return task.getSprint().getProject();
        if (task.getStory() != null && task.getStory().getBacklog() != null) return task.getStory().getBacklog().getProject();
        return null;
    }

    private void notifyAssignee(Task task, String message) {
        if (task.getAssignedTo() == null) return;
        notificationRepository.save(Notification.builder()
                .user(task.getAssignedTo())
                .message(message)
                .targetUrl("/development")
                .build());
    }

    private void log(User actor, Project project, Task task, ActivityLog.Action action, String message) {
        if (actor == null) return;
        activityLogRepository.save(ActivityLog.builder()
                .actor(actor)
                .project(project)
                .task(task)
                .action(action)
                .message(message != null && message.length() > 500 ? message.substring(0, 500) : message)
                .build());
    }

    private GitHubIntegrationDTO toDto(GitHubIntegration integration) {
        return new GitHubIntegrationDTO(
                integration.getId(),
                integration.getProject().getId(),
                integration.getRepoOwner(),
                integration.getRepoName(),
                integration.isSyncIssues(),
                integration.isSyncPrs(),
                integration.isSyncCommits(),
                integration.getLastSyncedAt(),
                true
        );
    }

    private String generateSecret() {
        byte[] bytes = new byte[32];
        new SecureRandom().nextBytes(bytes);
        return bytesToHex(bytes);
    }

    private String bytesToHex(byte[] bytes) {
        StringBuilder sb = new StringBuilder(bytes.length * 2);
        for (byte b : bytes) {
            sb.append(String.format("%02x", b));
        }
        return sb.toString();
    }

    private String shortSha(String sha) {
        if (sha == null) return "";
        return sha.length() <= 7 ? sha : sha.substring(0, 7);
    }

    private String repoFullName(GitHubIntegration integration) {
        return integration.getRepoOwner() + "/" + integration.getRepoName();
    }

    private String issueKey(Task task) {
        return issuePrefix(resolveProject(task)) + "-" + task.getId();
    }

    private String issuePrefix(Project project) {
        return project != null && project.getIssuePrefix() != null && !project.getIssuePrefix().isBlank()
                ? project.getIssuePrefix()
                : "KAN";
    }

    private String name(Enum<?> value) {
        return value != null ? value.name() : null;
    }

    private String truncate(String value, int maxLength) {
        if (value == null) return "";
        return value.length() <= maxLength ? value : value.substring(0, maxLength);
    }

    private String text(JsonNode node, String field) {
        JsonNode value = node.path(field);
        return value.isMissingNode() || value.isNull() ? null : value.asText();
    }

    private LocalDateTime parseDate(String value) {
        if (value == null || value.isBlank()) return null;
        return OffsetDateTime.parse(value)
                .atZoneSameInstant(ZoneId.systemDefault())
                .toLocalDateTime();
    }
}
