package com.agileflow.entity;

public enum TypeTache {
    EPIC,      // conteneur principal
    STORY,     // user story
    TASK,      // tâche standard
    FEATURE,   // fonctionnalité
    BUG,       // bug
    SUBTASK    // sous-tâche (enfant d'un TASK/BUG/FEATURE)
}
