package com.agileflow.controller;

import com.agileflow.dto.*;
import com.agileflow.service.KanbanService;
import com.agileflow.service.PlanningService;
import com.agileflow.service.TaskService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/tasks")
@RequiredArgsConstructor
public class TaskController {

    private final TaskService taskService;
    private final PlanningService planningService;
    private final KanbanService kanbanService;

    @GetMapping("/kanban/board")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<KanbanBoardDto> getKanbanBoard(
            @RequestParam Long projectId,
            @RequestParam(required = false) Long sprintId,
            @RequestParam(required = false) Long assigneeId,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String priorite
    ) {
        return ResponseEntity.ok(kanbanService.getBoard(projectId, sprintId, assigneeId, search, priorite));
    }

    @PostMapping("/kanban/quick-create")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<KanbanTaskDto> quickCreate(@Valid @RequestBody QuickCreateTaskRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(kanbanService.quickCreate(request));
    }

    @PostMapping("/kanban/columns")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<?> addColumn() {
        return ResponseEntity.status(HttpStatus.NOT_IMPLEMENTED)
                .body(java.util.Map.of("message", "Les statuts personnalises seront disponibles prochainement"));
    }

    @GetMapping("/planning")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<PlanningPageResponse> getPlanningTasks(
            @RequestParam(required = false) Long projectId,
            @RequestParam(required = false) Long sprintId,
            @RequestParam(required = false) String statut,
            @RequestParam(required = false) String priorite,
            @RequestParam(required = false) Long assigneeId,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String groupBy,
            @RequestParam(defaultValue = "dateCreation") String sortBy,
            @RequestParam(defaultValue = "DESC") String sortDir,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size
    ) {
        return ResponseEntity.ok(planningService.getPlanningTasks(
                projectId, sprintId, statut, priorite, assigneeId, search, groupBy, sortBy, sortDir, page, size
        ));
    }

    @PutMapping("/planning/bulk")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<BulkActionResponse> bulkAction(@RequestBody BulkActionRequest request) {
        return ResponseEntity.ok(planningService.bulkAction(request));
    }

    @GetMapping("/planning/saved-views")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<SavedViewDto>> getSavedViews() {
        return ResponseEntity.ok(planningService.getSavedViews());
    }

    @PostMapping("/planning/saved-views")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<SavedViewDto> createSavedView(@RequestBody SavedViewRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(planningService.createSavedView(request));
    }

    @DeleteMapping("/planning/saved-views/{id}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Void> deleteSavedView(@PathVariable Long id) {
        planningService.deleteSavedView(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/planning/export")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<byte[]> exportPlanning(
            @RequestParam(required = false) Long projectId,
            @RequestParam(required = false) Long sprintId,
            @RequestParam(required = false) String statut,
            @RequestParam(required = false) String priorite,
            @RequestParam(required = false) Long assigneeId,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String groupBy,
            @RequestParam(defaultValue = "dateCreation") String sortBy,
            @RequestParam(defaultValue = "DESC") String sortDir,
            @RequestParam(defaultValue = "xlsx") String format
    ) {
        if (!"xlsx".equalsIgnoreCase(format) && !"excel".equalsIgnoreCase(format)) {
            throw new IllegalArgumentException("Format export non supporte");
        }
        byte[] excel = planningService.exportExcel(projectId, sprintId, statut, priorite, assigneeId, search, groupBy, sortBy, sortDir);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=agileflow-planning.xlsx")
                .contentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                .body(excel);
    }

    @PatchMapping("/{id}/inline")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<PlanningTaskDto> inlineEdit(@PathVariable Long id, @RequestBody InlineEditRequest request) {
        return ResponseEntity.ok(planningService.inlineEdit(id, request));
    }

    @PostMapping("/{parentId}/subtasks")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<PlanningTaskDto> createSubtask(
            @PathVariable Long parentId,
            @RequestBody CreateSubtaskRequest request
    ) {
        return ResponseEntity.status(HttpStatus.CREATED).body(taskService.createSubtask(parentId, request));
    }

    @GetMapping("/{taskId}/subtasks")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<PlanningTaskDto>> getSubtasks(@PathVariable Long taskId) {
        return ResponseEntity.ok(taskService.getSubtasks(taskId));
    }

    @DeleteMapping("/{taskId}/subtasks/{subtaskId}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Void> detachSubtask(@PathVariable Long taskId, @PathVariable Long subtaskId) {
        taskService.detachSubtask(taskId, subtaskId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping
    @PreAuthorize("isAuthenticated()")
    public List<TaskDTO> getTasks(
            @RequestParam(required = false) Long sprintId,
            @RequestParam(required = false) Long projectId) {
        if (sprintId != null) {
            return taskService.getTasksBySprint(sprintId);
        } else if (projectId != null) {
            return taskService.getTasksByProject(projectId);
        }
        throw new IllegalArgumentException("sprintId ou projectId doit être fourni");
    }

    @PostMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<TaskDTO> createTask(@Valid @RequestBody CreateTaskRequest request) {
        TaskDTO created = taskService.createTask(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @PutMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    public TaskDTO updateTask(@PathVariable Long id, @Valid @RequestBody UpdateTaskRequest request) {
        return taskService.updateTask(id, request);
    }

    @PutMapping("/{id}/move")
    @PreAuthorize("isAuthenticated()")
    public TaskDTO moveTask(@PathVariable Long id, @Valid @RequestBody MoveTaskRequest request) {
        return taskService.moveTask(id, request);
    }

    @PutMapping("/{id}/assign")
    @PreAuthorize("isAuthenticated()")
    public TaskDTO assignTask(@PathVariable Long id, @Valid @RequestBody AssignTaskRequest request) {
        return taskService.assignTask(id, request);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Void> deleteTask(@PathVariable Long id) {
        taskService.deleteTask(id);
        return ResponseEntity.noContent().build();
    }
}
