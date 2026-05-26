package com.agileflow.controller;

import com.agileflow.dto.timeline.CreateTimelineEpicRequest;
import com.agileflow.dto.timeline.TimelineDto;
import com.agileflow.dto.timeline.TimelineEpicDto;
import com.agileflow.dto.timeline.TimelineTaskDto;
import com.agileflow.dto.timeline.UpdateDatesRequest;
import com.agileflow.service.TimelineService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/timeline")
@RequiredArgsConstructor
public class TimelineController {

    private final TimelineService timelineService;

    @GetMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<TimelineDto> getTimeline(
            @RequestParam Long projectId,
            @RequestParam(required = false) Long epicId,
            @RequestParam(required = false) String type,
            @RequestParam(required = false) String statut,
            @RequestParam(required = false) Long assigneeId,
            @RequestParam(required = false) String search,
            @RequestParam(defaultValue = "MOIS") String vue
    ) {
        return ResponseEntity.ok(timelineService.getTimeline(projectId, epicId, type, statut, assigneeId, search, vue));
    }

    @PatchMapping("/{taskId}/dates")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<TimelineTaskDto> updateDates(@PathVariable Long taskId, @RequestBody UpdateDatesRequest request) {
        return ResponseEntity.ok(timelineService.updateDates(taskId, request));
    }

    @PostMapping("/epics")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<TimelineEpicDto> createEpic(@Valid @RequestBody CreateTimelineEpicRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(timelineService.createEpic(request));
    }
}
