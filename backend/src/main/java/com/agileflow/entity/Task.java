package com.agileflow.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.Set;

@Entity
@Table(name = "tasks")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Task {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    private String titre;
    private String description;
    @Enumerated(EnumType.STRING)
    @Builder.Default
    private Statut statut = Statut.TODO;
    @Enumerated(EnumType.STRING)
    @Builder.Default
    private Priorite priorite = Priorite.MEDIUM;
    @Enumerated(EnumType.STRING)
    @Builder.Default
    private Type type = Type.TASK;

    @Enumerated(EnumType.STRING)
    @Column(name = "type_tache")
    @Builder.Default
    private TypeTache typeTache = TypeTache.TASK;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "parent_task_id")
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private Task parentTask;

    @OneToMany(mappedBy = "parentTask", cascade = CascadeType.ALL)
    @OrderBy("dateCreation ASC")
    @Builder.Default
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private java.util.List<Task> sousTaskes = new java.util.ArrayList<>();

    private LocalDateTime dateEcheance;
    @Column(name = "date_debut")
    private LocalDateTime dateDebut;
    @Builder.Default
    private LocalDateTime dateCreation = LocalDateTime.now();
    private LocalDateTime dateMiseAJour;
    @Builder.Default
    private boolean isUrgent = false;
    @Builder.Default
    private boolean deadline24hReminderSent = false;
    @Builder.Default
    private boolean deadline1hReminderSent = false;
    @ManyToOne
    @JoinColumn(name = "assigned_to")
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private User assignedTo;
    @ManyToOne
    @JoinColumn(name = "assigned_by")
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private User assignedBy;
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "project_id")
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private Project project;

    @ManyToOne
    @JoinColumn(name = "sprint_id")
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private Sprint sprint;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "story_id")
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private UserStory story;

    @ElementCollection
    @CollectionTable(name = "task_labels", joinColumns = @JoinColumn(name = "task_id"))
    @Column(name = "label")
    @Builder.Default
    private Set<String> labels = new HashSet<>();

    @OneToMany(mappedBy = "task", fetch = FetchType.LAZY)
    @Builder.Default
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private java.util.List<Diagram> diagrams = new java.util.ArrayList<>();

    public enum Statut {
        TODO, IN_PROGRESS, REVIEW, DONE
    }
    public enum Priorite {
        LOW, MEDIUM, HIGH, CRITICAL
    }
    public enum Type {
        EPIC, TASK, STORY, FEATURE, BUG
    }

    @PrePersist
    void onCreate() {
        if (dateCreation == null) {
            dateCreation = LocalDateTime.now();
        }
        if (type == null) {
            type = Type.TASK;
        }
        if (typeTache == null || typeTache == TypeTache.TASK) {
            syncTypeTache();
        }
        dateMiseAJour = dateCreation;
    }

    @PreUpdate
    void onUpdate() {
        dateMiseAJour = LocalDateTime.now();
        // On ne synchronise pas forcément ici car typeTache peut être SUBTASK 
        // ce qui n'existe pas dans l'ancien enum Type.
    }

    private void syncTypeTache() {
        if (this.type == null) return;
        switch (this.type) {
            case EPIC -> this.typeTache = TypeTache.EPIC;
            case STORY -> this.typeTache = TypeTache.STORY;
            case FEATURE -> this.typeTache = TypeTache.FEATURE;
            case BUG -> this.typeTache = TypeTache.BUG;
            default -> this.typeTache = TypeTache.TASK;
        }
    }
}
