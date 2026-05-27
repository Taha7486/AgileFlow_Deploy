package com.agileflow.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "github_integrations")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class GitHubIntegration {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "project_id", nullable = false, unique = true)
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private Project project;

    @Column(name = "repo_owner", nullable = false)
    private String repoOwner;

    @Column(name = "repo_name", nullable = false)
    private String repoName;

    @Column(name = "access_token", nullable = false, length = 1000)
    private String accessToken;

    @Column(name = "webhook_id")
    private Long webhookId;

    @Column(name = "webhook_secret", nullable = false)
    private String webhookSecret;

    @Builder.Default
    @Column(name = "sync_issues")
    private boolean syncIssues = true;

    @Builder.Default
    @Column(name = "sync_prs")
    private boolean syncPrs = true;

    @Builder.Default
    @Column(name = "sync_commits")
    private boolean syncCommits = true;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "last_synced_at")
    private LocalDateTime lastSyncedAt;

    @PrePersist
    void onCreate() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
    }
}
