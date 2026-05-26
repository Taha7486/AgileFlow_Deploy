package com.agileflow.service;

import com.agileflow.entity.Task;
import com.agileflow.repository.TaskRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class TaskDeadlineHierarchyService {

    private final TaskRepository taskRepository;

    public void normalizeDeadlineHierarchy(Task task) {
        if (task == null) {
            return;
        }
        normalizeOwnDeadline(task);

        Task parent = task.getParentTask();
        while (parent != null) {
            normalizeOwnDeadline(parent);
            taskRepository.save(parent);
            parent = parent.getParentTask();
        }
    }

    private void normalizeOwnDeadline(Task task) {
        if (task.getId() == null) {
            return;
        }

        LocalDateTime maxChildDeadline = maxDescendantDeadline(task.getId());
        if (maxChildDeadline == null) {
            return;
        }

        if (task.getDateEcheance() == null || task.getDateEcheance().isBefore(maxChildDeadline)) {
            task.setDateEcheance(maxChildDeadline);
            task.setUrgent(task.getStatut() != Task.Statut.DONE && isWithinUrgentWindow(maxChildDeadline));
        }
    }

    private LocalDateTime maxDescendantDeadline(Long parentId) {
        List<Task> children = taskRepository.findByParentTask_Id(parentId);
        LocalDateTime max = null;
        for (Task child : children) {
            max = latest(max, child.getDateEcheance());
            max = latest(max, maxDescendantDeadline(child.getId()));
        }
        return max;
    }

    private LocalDateTime latest(LocalDateTime left, LocalDateTime right) {
        if (left == null) {
            return right;
        }
        if (right == null) {
            return left;
        }
        return left.isAfter(right) ? left : right;
    }

    private boolean isWithinUrgentWindow(LocalDateTime dateEcheance) {
        LocalDateTime now = LocalDateTime.now();
        return dateEcheance != null && dateEcheance.isAfter(now) && !dateEcheance.isAfter(now.plusHours(24));
    }
}
