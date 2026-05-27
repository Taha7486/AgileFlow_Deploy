package com.agileflow.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(
        name = "github_task_branches",
        uniqueConstraints = @UniqueConstraint(columnNames = {"task_id", "branch_name"})
)
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class GitHubTaskBranch {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "task_id", nullable = false)
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private Task task;

    @Column(name = "branch_name", nullable = false, length = 255)
    private String branchName;

    @Column(name = "sha", length = 40)
    private String sha;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @PrePersist
    public void prePersist() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
    }
}
