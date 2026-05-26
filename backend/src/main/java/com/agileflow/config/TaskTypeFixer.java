package com.agileflow.config;

import com.agileflow.entity.Task;
import com.agileflow.entity.TypeTache;
import com.agileflow.repository.TaskRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Component
@RequiredArgsConstructor
@Slf4j
public class TaskTypeFixer implements CommandLineRunner {

    private final TaskRepository taskRepository;

    @Override
    @Transactional
    public void run(String... args) {
        log.info("Vérification de la synchronisation des types de tâches...");
        List<Task> tasks = taskRepository.findAll();
        long updatedCount = 0;

        for (Task task : tasks) {
            if (task.getTypeTache() == TypeTache.TASK && task.getType() != Task.Type.TASK) {
                sync(task);
                taskRepository.save(task);
                updatedCount++;
            }
        }

        if (updatedCount > 0) {
            log.info("Synchronisation terminée : {} tâches mises à jour.", updatedCount);
        }
    }

    private void sync(Task task) {
        if (task.getType() == null) return;
        switch (task.getType()) {
            case EPIC -> task.setTypeTache(TypeTache.EPIC);
            case STORY -> task.setTypeTache(TypeTache.STORY);
            case FEATURE -> task.setTypeTache(TypeTache.FEATURE);
            case BUG -> task.setTypeTache(TypeTache.BUG);
            default -> task.setTypeTache(TypeTache.TASK);
        }
    }
}
