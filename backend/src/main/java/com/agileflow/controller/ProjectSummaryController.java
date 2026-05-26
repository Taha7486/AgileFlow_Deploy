package com.agileflow.controller;

import com.agileflow.dto.summary.ActivityGroupDto;
import com.agileflow.dto.summary.EpicProgressDto;
import com.agileflow.dto.summary.ProjectSummaryDto;
import com.agileflow.dto.summary.WorkloadDto;
import com.agileflow.service.ProjectSummaryService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/projects/{projectId}/summary")
@RequiredArgsConstructor
public class ProjectSummaryController {

    private final ProjectSummaryService projectSummaryService;

    @GetMapping
    public ResponseEntity<ProjectSummaryDto> getSummary(
            @PathVariable Long projectId,
            @RequestParam(defaultValue = "7") int jours
    ) {
        return ResponseEntity.ok(projectSummaryService.getSummary(projectId, jours));
    }

    @GetMapping("/activity")
    public ResponseEntity<List<ActivityGroupDto>> getRecentActivity(
            @PathVariable Long projectId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        return ResponseEntity.ok(projectSummaryService.getRecentActivity(projectId, page, size));
    }

    @GetMapping("/workload")
    public ResponseEntity<List<WorkloadDto>> getTeamWorkload(@PathVariable Long projectId) {
        return ResponseEntity.ok(projectSummaryService.getTeamWorkload(projectId));
    }

    @GetMapping("/epic-progress")
    public ResponseEntity<List<EpicProgressDto>> getEpicProgress(@PathVariable Long projectId) {
        return ResponseEntity.ok(projectSummaryService.getEpicProgress(projectId));
    }
}
