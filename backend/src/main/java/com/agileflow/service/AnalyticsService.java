package com.agileflow.service;

import com.agileflow.dto.ActivityHeatmapDTO;
import com.agileflow.dto.AnalyticsDTO;
import com.agileflow.dto.AnalyticsMemberStatsDTO;
import com.agileflow.dto.AnalyticsPeriod;
import com.agileflow.dto.AnalyticsTrendDTO;
import com.agileflow.entity.Sprint;
import com.agileflow.entity.User;
import com.agileflow.exception.BadRequestException;
import com.agileflow.exception.ResourceNotFoundException;
import com.agileflow.repository.ActivityLogRepository;
import com.agileflow.repository.SprintRepository;
import com.agileflow.repository.TaskRepository;
import com.agileflow.repository.UserRepository;
import com.itextpdf.io.image.ImageData;
import com.itextpdf.io.image.ImageDataFactory;
import com.itextpdf.kernel.colors.ColorConstants;
import com.itextpdf.kernel.colors.DeviceRgb;
import com.itextpdf.kernel.geom.PageSize;
import com.itextpdf.kernel.pdf.PdfDocument;
import com.itextpdf.kernel.pdf.PdfWriter;
import com.itextpdf.layout.borders.SolidBorder;
import com.itextpdf.layout.Document;
import com.itextpdf.layout.element.Cell;
import com.itextpdf.layout.element.Image;
import com.itextpdf.layout.element.Paragraph;
import com.itextpdf.layout.element.Table;
import com.itextpdf.layout.properties.HorizontalAlignment;
import com.itextpdf.layout.properties.TextAlignment;
import com.itextpdf.layout.properties.UnitValue;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.ClassPathResource;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class AnalyticsService {

    private static final DeviceRgb BRAND_BLUE = new DeviceRgb(37, 99, 235);
    private static final DeviceRgb BRAND_PURPLE = new DeviceRgb(124, 58, 237);
    private static final DeviceRgb TEXT_DARK = new DeviceRgb(15, 23, 42);
    private static final DeviceRgb TEXT_MUTED = new DeviceRgb(100, 116, 139);
    private static final DeviceRgb BORDER = new DeviceRgb(226, 232, 240);
    private static final DeviceRgb SOFT_BLUE = new DeviceRgb(239, 246, 255);
    private static final DeviceRgb SOFT_GREEN = new DeviceRgb(240, 253, 244);

    private final ActivityLogRepository activityLogRepository;
    private final UserRepository userRepository;
    private final SprintRepository sprintRepository;
    private final TaskRepository taskRepository;
    private final ProjectAccessService projectAccessService;

    private User currentUser() {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("Utilisateur courant introuvable"));
    }

    @Transactional(readOnly = true)
    public AnalyticsDTO getAnalytics(AnalyticsPeriod period, Long sprintId, Long projectId) {
        User actor = currentUser();
        DateRange range = resolveDateRange(period, sprintId);
        if (projectId != null) {
            projectAccessService.assertProjectAccess(actor, projectAccessService.getProjectOrThrow(projectId));
        }
        Scope scope = projectId != null ? new Scope(null, null) : resolveScope(actor);

        List<AnalyticsMemberStatsDTO> memberStats = memberStats(range, scope, projectId, actor);
        List<AnalyticsTrendDTO> trend = trend(range, scope, projectId);
        List<ActivityHeatmapDTO> heatmap = heatmap(trend);
        long completedTasks = taskRepository.countCompletedForAnalytics(
                range.startDate().atStartOfDay(), range.endDate().plusDays(1).atStartOfDay(), projectId, range.sprintId(), scope.managerId(), scope.actorId());
        long totalActivities = activityLogRepository.countForScope(
                range.startDate().atStartOfDay(), range.endDate().plusDays(1).atStartOfDay(), projectId, range.sprintId(), scope.managerId(), scope.actorId());
        long activeMembers = countActiveMembers(actor, projectId);

        return new AnalyticsDTO(
                periodOrDefault(period).name(),
                range.startDate().toString(),
                range.endDate().toString(),
                range.sprintId(),
                totalActivities,
                completedTasks,
                activeMembers,
                memberStats,
                heatmap,
                trend
        );
    }

    @Transactional(readOnly = true)
    public byte[] exportAnalyticsPdf(AnalyticsPeriod period, Long sprintId, Long projectId) {
        AnalyticsDTO analytics = getAnalytics(period, sprintId, projectId);
        ByteArrayOutputStream out = new ByteArrayOutputStream();

        try (PdfWriter writer = new PdfWriter(out);
             PdfDocument pdf = new PdfDocument(writer)) {
            pdf.setDefaultPageSize(PageSize.A4);
            try (Document document = new Document(pdf)) {
                document.setMargins(34, 34, 34, 34);

                addPdfHeader(document, analytics);
                addKpiSection(document, analytics);
                addTrendTable(document, analytics);
                addMemberTable(document, analytics);
                addFooter(document);
            }
        } catch (IOException e) {
            throw new IllegalStateException("Impossible de generer le PDF analytics", e);
        }

        return out.toByteArray();
    }

    private void addPdfHeader(Document document, AnalyticsDTO analytics) throws IOException {
        Table header = new Table(UnitValue.createPercentArray(new float[]{1, 6})).useAllAvailableWidth();
        header.setMarginBottom(16);
        Image logo = loadLogoImage();
        if (logo != null) {
            header.addCell(new Cell()
                    .setBorder(null)
                    .add(logo.setWidth(54).setHeight(54)));
        } else {
            header.addCell(new Cell()
                    .setBorder(null)
                    .add(new Paragraph("AF").setBold().setFontSize(20).setFontColor(BRAND_BLUE)));
        }
        header.addCell(new Cell()
                .setBorder(null)
                .add(new Paragraph("AgileFlow")
                        .setBold()
                        .setFontSize(24)
                        .setFontColor(BRAND_BLUE)
                        .setMarginBottom(0))
                .add(new Paragraph("Rapport Analytics")
                        .setFontSize(15)
                        .setFontColor(TEXT_DARK)
                        .setMarginTop(0))
                .add(new Paragraph("Periode " + periodLabel(analytics.period()) + " - du "
                        + analytics.startDate() + " au " + analytics.endDate())
                        .setFontSize(10)
                        .setFontColor(TEXT_MUTED)));
        document.add(header);
    }

    private Image loadLogoImage() throws IOException {
        ClassPathResource resource = new ClassPathResource("static/agileflow-icon.png");
        if (!resource.exists()) {
            return null;
        }
        try (InputStream input = resource.getInputStream()) {
            ImageData data = ImageDataFactory.create(input.readAllBytes());
            return new Image(data);
        }
    }

    private void addKpiSection(Document document, AnalyticsDTO analytics) {
        Table kpis = new Table(UnitValue.createPercentArray(new float[]{1, 1, 1})).useAllAvailableWidth();
        kpis.setMarginBottom(18);
        kpis.addCell(kpiCell("Activites", analytics.totalActivities(), SOFT_BLUE, BRAND_BLUE));
        kpis.addCell(kpiCell("Taches terminees", analytics.completedTasks(), SOFT_GREEN, new DeviceRgb(22, 163, 74)));
        kpis.addCell(kpiCell("Membres actifs", analytics.activeMembers(), new DeviceRgb(245, 243, 255), BRAND_PURPLE));
        document.add(kpis);
    }

    private Cell kpiCell(String label, long value, DeviceRgb background, DeviceRgb accent) {
        return new Cell()
                .setBackgroundColor(background)
                .setBorder(new SolidBorder(BORDER, 1))
                .setPadding(12)
                .add(new Paragraph(label).setFontSize(10).setFontColor(TEXT_MUTED).setMarginBottom(4))
                .add(new Paragraph(String.valueOf(value)).setBold().setFontSize(24).setFontColor(accent).setMargin(0));
    }

    private void addTrendTable(Document document, AnalyticsDTO analytics) {
        document.add(sectionTitle("Evolution par date"));
        Table table = new Table(UnitValue.createPercentArray(new float[]{2, 2, 2})).useAllAvailableWidth();
        addHeaderCell(table, "Date");
        addHeaderCell(table, "Activites");
        addHeaderCell(table, "Taches terminees");
        analytics.trend().stream()
                .filter(item -> item.activityCount() > 0 || item.completedTasks() > 0)
                .limit(30)
                .forEach(item -> {
                    table.addCell(bodyCell(item.date()));
                    table.addCell(bodyCell(String.valueOf(item.activityCount())).setTextAlignment(TextAlignment.RIGHT));
                    table.addCell(bodyCell(String.valueOf(item.completedTasks())).setTextAlignment(TextAlignment.RIGHT));
                });
        if (table.getNumberOfRows() == 1) {
            table.addCell(bodyCell("Aucune donnee sur la periode"));
            table.addCell(bodyCell("0").setTextAlignment(TextAlignment.RIGHT));
            table.addCell(bodyCell("0").setTextAlignment(TextAlignment.RIGHT));
        }
        document.add(table.setMarginBottom(18));
    }

    private void addMemberTable(Document document, AnalyticsDTO analytics) {
        document.add(sectionTitle("Activite par membre"));
        Table table = new Table(UnitValue.createPercentArray(new float[]{4, 2, 2, 2})).useAllAvailableWidth();
        addHeaderCell(table, "Membre");
        addHeaderCell(table, "Role");
        addHeaderCell(table, "Activites");
        addHeaderCell(table, "Taches terminees");
            for (AnalyticsMemberStatsDTO member : analytics.memberStats()) {
            table.addCell(bodyCell(member.memberName()));
            table.addCell(bodyCell(roleLabel(member.role())));
            table.addCell(bodyCell(String.valueOf(member.activityCount())).setTextAlignment(TextAlignment.RIGHT));
            table.addCell(bodyCell(String.valueOf(member.completedTasks())).setTextAlignment(TextAlignment.RIGHT));
            }
        document.add(table);
    }

    private Paragraph sectionTitle(String title) {
        return new Paragraph(title)
                .setBold()
                .setFontSize(13)
                .setFontColor(TEXT_DARK)
                .setMarginTop(4)
                .setMarginBottom(8);
    }

    private void addHeaderCell(Table table, String text) {
        table.addHeaderCell(new Cell()
                .setBackgroundColor(BRAND_BLUE)
                .setFontColor(ColorConstants.WHITE)
                .setBorder(new SolidBorder(BRAND_BLUE, 1))
                .setPadding(8)
                .add(new Paragraph(text).setBold().setFontSize(10)));
    }

    private Cell bodyCell(String text) {
        return new Cell()
                .setBorder(new SolidBorder(BORDER, 1))
                .setPadding(7)
                .add(new Paragraph(text == null ? "" : text).setFontSize(9).setFontColor(TEXT_DARK));
    }

    private void addFooter(Document document) {
        document.add(new Paragraph("Genere par AgileFlow")
                .setFontSize(9)
                .setFontColor(TEXT_MUTED)
                .setTextAlignment(TextAlignment.CENTER)
                .setMarginTop(18));
    }

    private String periodLabel(String period) {
        return switch (period) {
            case "YEAR" -> "Derniere annee";
            case "MONTH" -> "Mois";
            case "WEEK" -> "Semaine";
            default -> period;
        };
    }

    private String roleLabel(String role) {
        return switch (role) {
            case "ROLE_ADMIN" -> "Admin plateforme";
            case "ROLE_DEVELOPER" -> "Developpeur";
            case "OWNER" -> "Owner";
            case "ADMIN" -> "Admin projet";
            case "VIEWER" -> "Lecteur";
            default -> role;
        };
    }

    private List<AnalyticsMemberStatsDTO> memberStats(DateRange range, Scope scope, Long projectId, User actor) {
        Map<Long, AnalyticsMemberStatsDTO> byMember = new HashMap<>();
        for (Object[] row : activeUserRows(projectId, actor)) {
            Long userId = (Long) row[0];
            String fullName = String.valueOf(row[1]).trim();
            String fallbackEmail = String.valueOf(row[2]);
            byMember.put(userId, new AnalyticsMemberStatsDTO(
                    userId,
                    fullName.isBlank() ? fallbackEmail : fullName,
                    String.valueOf(row[3]),
                    0,
                    0
            ));
        }

        for (Object[] row : activityLogRepository.aggregateByMember(
                range.startDate().atStartOfDay(), range.endDate().plusDays(1).atStartOfDay(), projectId, range.sprintId(), scope.managerId(), scope.actorId())) {
            Long userId = (Long) row[0];
            AnalyticsMemberStatsDTO existing = byMember.get(userId);
            String fullName = String.valueOf(row[1]).trim();
            String fallbackEmail = String.valueOf(row[2]);
            if (existing != null) {
                byMember.put(userId, new AnalyticsMemberStatsDTO(
                        existing.userId(),
                        existing.memberName(),
                        existing.role(),
                        number(row[4]),
                        existing.completedTasks()
                ));
            } else {
                byMember.put(userId, new AnalyticsMemberStatsDTO(
                        userId,
                        fullName.isBlank() ? fallbackEmail : fullName,
                        String.valueOf(row[3]),
                        number(row[4]),
                        0
                ));
            }
        }

        for (Object[] row : taskRepository.aggregateCompletedForAnalyticsByMember(
                range.startDate().atStartOfDay(), range.endDate().plusDays(1).atStartOfDay(), projectId, range.sprintId(), scope.managerId(), scope.actorId())) {
            Long userId = (Long) row[0];
            AnalyticsMemberStatsDTO existing = byMember.get(userId);
            String fullName = String.valueOf(row[1]).trim();
            String fallbackEmail = String.valueOf(row[2]);
            long completedCount = number(row[4]);
            byMember.put(userId, new AnalyticsMemberStatsDTO(
                    userId,
                    existing != null ? existing.memberName() : (fullName.isBlank() ? fallbackEmail : fullName),
                    existing != null ? existing.role() : String.valueOf(row[3]),
                    existing != null ? existing.activityCount() : completedCount,
                    completedCount
            ));
        }

        return byMember.values().stream()
                .sorted((left, right) -> Long.compare(right.completedTasks() + right.activityCount(), left.completedTasks() + left.activityCount()))
                .toList();
    }

    private List<ActivityHeatmapDTO> heatmap(List<AnalyticsTrendDTO> trend) {
        return trend.stream()
                .map(item -> new ActivityHeatmapDTO(item.date(), item.activityCount()))
                .toList();
    }

    private List<AnalyticsTrendDTO> trend(DateRange range, Scope scope, Long projectId) {
        Map<LocalDate, Long> activityByDate = new HashMap<>();
        for (Object[] row : activityLogRepository.aggregateByDate(
                range.startDate().atStartOfDay(), range.endDate().plusDays(1).atStartOfDay(), projectId, range.sprintId(), scope.managerId(), scope.actorId())) {
            activityByDate.put((LocalDate) row[0], number(row[1]));
        }
        Map<LocalDate, Long> completedByDate = new HashMap<>();
        for (Object[] row : taskRepository.aggregateCompletedForAnalyticsByDate(
                range.startDate().atStartOfDay(), range.endDate().plusDays(1).atStartOfDay(), projectId, range.sprintId(), scope.managerId(), scope.actorId())) {
            completedByDate.put((LocalDate) row[0], number(row[1]));
        }

        List<AnalyticsTrendDTO> trend = new ArrayList<>();
        LocalDate cursor = range.startDate();
        while (!cursor.isAfter(range.endDate())) {
            trend.add(new AnalyticsTrendDTO(
                    cursor.toString(),
                    activityByDate.getOrDefault(cursor, 0L),
                    completedByDate.getOrDefault(cursor, 0L)
            ));
            cursor = cursor.plusDays(1);
        }
        return trend;
    }

    private DateRange resolveDateRange(AnalyticsPeriod requestedPeriod, Long sprintId) {
        AnalyticsPeriod period = periodOrDefault(requestedPeriod);
        LocalDate today = LocalDate.now();
        return switch (period) {
            case WEEK -> new DateRange(today.minusDays(6), today, sprintId);
            case MONTH -> new DateRange(today.minusDays(29), today, sprintId);
            case YEAR -> new DateRange(today.minusYears(1).plusDays(1), today, sprintId);
            case SPRINT -> {
                if (sprintId == null) {
                    throw new BadRequestException("Le filtre SPRINT exige un sprintId.");
                }
                Sprint sprint = sprintRepository.findById(sprintId)
                        .orElseThrow(() -> new ResourceNotFoundException("Sprint introuvable"));
                if (sprint.getDateDebut() == null || sprint.getDateFin() == null) {
                    throw new BadRequestException("Le sprint doit avoir une date de debut et une date de fin.");
                }
                yield new DateRange(sprint.getDateDebut(), sprint.getDateFin(), sprintId);
            }
        };
    }

    private AnalyticsPeriod periodOrDefault(AnalyticsPeriod period) {
        return period == null ? AnalyticsPeriod.YEAR : period;
    }

    private Scope resolveScope(User actor) {
        return actor.getRole() == User.Role.ROLE_ADMIN
                ? new Scope(null, null)
                : new Scope(null, actor.getId());
    }

    private long countActiveMembers(User actor, Long projectId) {
        if (projectId != null) {
            return userRepository.countActiveParticipantsByProjectId(projectId);
        }
        if (actor.getRole() == User.Role.ROLE_ADMIN) {
            return userRepository.countByActifTrue();
        }
        return actor.isActif() ? 1 : 0;
    }

    private List<Object[]> activeUserRows(Long projectId, User actor) {
        if (projectId != null) {
            return userRepository.findActiveParticipantsForAnalytics(projectId);
        }
        if (actor.getRole() == User.Role.ROLE_ADMIN) {
            return userRepository.findActiveUsersForAnalytics();
        }
        return Collections.singletonList(new Object[]{
                actor.getId(),
                ((actor.getPrenom() == null ? "" : actor.getPrenom()) + " " + (actor.getNom() == null ? "" : actor.getNom())).trim(),
                actor.getEmail(),
                actor.getRole()
        });
    }

    private long number(Object value) {
        return value == null ? 0 : ((Number) value).longValue();
    }

    private record DateRange(LocalDate startDate, LocalDate endDate, Long sprintId) {
    }

    private record Scope(Long managerId, Long actorId) {
    }
}
