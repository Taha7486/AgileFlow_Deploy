package com.agileflow.service;

import com.agileflow.entity.Project;
import com.agileflow.entity.Sprint;
import com.agileflow.entity.Task;
import com.agileflow.entity.User;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

@Service
public class EmailTemplateService {

    private static final DateTimeFormatter DATE_TIME_FORMAT = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");
    private static final String BRAND_GRADIENT = "linear-gradient(135deg,#2563eb 0%,#7c3aed 100%)";

    @Value("${app.frontend-url:http://localhost:5173}")
    private String frontendUrl;

    public RenderedEmail buildPreview(User recipient, EmailNotificationType type) {
        return switch (type) {
            case SPRINT_START -> buildSprintStarted(recipient, sampleSprint());
            case TASK_ASSIGNED -> buildTaskAssigned(recipient, sampleTask());
            case DEADLINE -> buildDeadlineReminder(recipient, sampleTask());
            case MENTION -> buildMention(recipient, sampleTask(), "Sara Manager");
        };
    }

    public RenderedEmail buildSprintStarted(User recipient, Sprint sprint) {
        String subject = "Sprint demarre: " + sprint.getNom();
        String projectName = sprint.getProject() != null ? sprint.getProject().getNom() : "Projet AgileFlow";
        String html = baseEmail(
                "Sprint lance",
                "Planification",
                BRAND_GRADIENT,
                "Bonjour " + escape(fullName(recipient)) + ",",
                """
                        <p style="margin:0 0 18px;line-height:1.65;color:#374151;">
                          Le sprint <strong>%s</strong> du projet <strong>%s</strong> vient de demarrer.
                        </p>
                        %s
                        <p style="margin:18px 0 0;line-height:1.65;color:#64748b;">
                          Consultez AgileFlow pour suivre le Kanban, les echeances et la charge de l'equipe.
                        </p>
                        """.formatted(
                        escape(sprint.getNom()),
                        escape(projectName),
                        detailsTable(new String[][]{
                                {"Date de debut", formatDate(sprint.getDateDebut())},
                                {"Date de fin", formatDate(sprint.getDateFin())},
                                {"Capacite", (sprint.getCapacitePoints() != null ? sprint.getCapacitePoints() : 0) + " points"}
                        })
                ),
                "Ouvrir AgileFlow",
                joinUrl(frontendUrl, "/kanban"),
                "Vous recevez cet email car les notifications de sprint sont activees."
        );
        return new RenderedEmail(subject, html);
    }

    public RenderedEmail buildTaskAssigned(User recipient, Task task) {
        String subject = "Nouvelle tache assignee: " + task.getTitre();
        String html = baseEmail(
                "Nouvelle assignation",
                "Tache",
                BRAND_GRADIENT,
                "Bonjour " + escape(fullName(recipient)) + ",",
                """
                        <p style="margin:0 0 18px;line-height:1.65;color:#374151;">
                          Une nouvelle tache vous a ete assignee dans AgileFlow.
                        </p>
                        %s
                        <p style="margin:18px 0 0;line-height:1.65;color:#64748b;">%s</p>
                        """.formatted(
                        detailsTable(new String[][]{
                                {"Tache", escape(task.getTitre())},
                                {"Priorite", task.getPriorite() != null ? task.getPriorite().name() : "MEDIUM"},
                                {"Statut", task.getStatut() != null ? task.getStatut().name() : "TODO"},
                                {"Echeance", formatDateTime(task.getDateEcheance())},
                                {"Sprint", task.getSprint() != null ? escape(task.getSprint().getNom()) : "Non planifie"}
                        }),
                        task.getDescription() == null || task.getDescription().isBlank()
                                ? "Consultez AgileFlow pour plus de details."
                                : escape(task.getDescription())
                ),
                "Voir la planification",
                joinUrl(frontendUrl, "/planning"),
                "Vous recevez cet email car les notifications d'assignation sont activees."
        );
        return new RenderedEmail(subject, html);
    }

    public RenderedEmail buildDeadlineReminder(User recipient, Task task) {
        return buildDeadlineReminder(recipient, task, joinUrl(frontendUrl, "/kanban"), "bientot");
    }

    public RenderedEmail buildDeadlineReminder(User recipient, Task task, String kanbanUrl, String reminderLabel) {
        String projectName = resolveProjectName(task);
        String subject = "Alerte deadline " + reminderLabel + ": " + task.getTitre();
        String html = baseEmail(
                "Il reste " + escape(reminderLabel),
                "Rappel deadline",
                "linear-gradient(135deg,#ea580c 0%,#f97316 100%)",
                "Bonjour " + escape(fullName(recipient)) + ",",
                """
                        <p style="margin:0 0 18px;line-height:1.65;color:#374151;">
                          Cette tache n'est pas encore marquee comme terminee et approche de son echeance.
                        </p>
                        %s
                        """.formatted(detailsTable(new String[][]{
                        {"Tache", escape(task.getTitre())},
                        {"Deadline", formatDateTime(task.getDateEcheance())},
                        {"Projet", escape(projectName)}
                })),
                "Ouvrir le Kanban",
                kanbanUrl,
                "Vous recevez cet email car les rappels de deadline sont actifs."
        );
        return new RenderedEmail(subject, html);
    }

    public RenderedEmail buildUrgentDeadlineAlert(User recipient, Task task, String kanbanUrl) {
        String projectName = resolveProjectName(task);

        String subject = "Alerte urgente: deadline proche pour " + task.getTitre();
        String html = baseEmail(
                "Action requise sous 24h",
                "Priorite intelligente",
                "linear-gradient(135deg,#dc2626 0%,#ef4444 100%)",
                "Bonjour " + escape(fullName(recipient)) + ",",
                """
                        <p style="margin:0 0 18px;line-height:1.65;color:#374151;">
                          Cette tache vient d'etre marquee comme <strong>URGENT</strong> car sa deadline approche.
                        </p>
                        %s
                        <p style="margin:18px 0 0;line-height:1.65;color:#64748b;">
                          Merci de la traiter en priorite pour limiter tout risque de retard.
                        </p>
                        """.formatted(detailsTable(new String[][]{
                        {"Tache", escape(task.getTitre())},
                        {"Deadline", formatDateTime(task.getDateEcheance())},
                        {"Projet", escape(projectName)}
                })),
                "Ouvrir le Kanban",
                kanbanUrl,
                "Vous recevez cet email car les alertes de deadline sont actives."
        );
        return new RenderedEmail(subject, html);
    }

    public RenderedEmail buildMention(User recipient, Task task, String authorName) {
        String subject = "Vous avez ete mentionne dans: " + task.getTitre();
        String html = baseEmail(
                "Mention recue",
                "Commentaire",
                BRAND_GRADIENT,
                "Bonjour " + escape(fullName(recipient)) + ",",
                """
                        <p style="margin:0 0 18px;line-height:1.65;color:#374151;">
                          <strong>%s</strong> vous a mentionne sur la tache <strong>%s</strong>.
                        </p>
                        <p style="margin:0;line-height:1.65;color:#64748b;">
                          Ouvrez AgileFlow pour lire le commentaire et repondre dans son contexte.
                        </p>
                        """.formatted(escape(authorName), escape(task.getTitre())),
                "Voir la tache",
                joinUrl(frontendUrl, "/planning"),
                "Vous recevez cet email car les notifications de mention sont activees."
        );
        return new RenderedEmail(subject, html);
    }

    public RenderedEmail buildProjectAdded(User recipient, Project project, User inviter, String projectUrl) {
        String projectName = project != null ? project.getNom() : "Projet AgileFlow";
        String inviterName = fullName(inviter);
        String subject = "Vous avez ete ajoute au projet \"" + projectName + "\"";
        String html = baseProjectEmail(
                "Bienvenue dans le projet",
                "Bonjour " + fullName(recipient) + ",",
                "<strong>" + escape(inviterName) + "</strong> vous a ajoute au projet <strong>\"" + escape(projectName) + "\"</strong>.",
                "Acceder au projet",
                projectUrl,
                "Vous recevez cet email car vous etes membre AgileFlow."
        );
        return new RenderedEmail(subject, html);
    }

    public RenderedEmail buildProjectInvitation(String email, Project project, User inviter, String registerUrl) {
        String projectName = project != null ? project.getNom() : "Projet AgileFlow";
        String inviterName = fullName(inviter);
        String subject = inviterName + " vous invite a rejoindre AgileFlow - Projet \"" + projectName + "\"";
        String html = baseProjectEmail(
                "Invitation AgileFlow",
                "Bonjour,",
                "<strong>" + escape(inviterName) + "</strong> vous invite a rejoindre AgileFlow pour collaborer sur le projet <strong>\"" + escape(projectName) + "\"</strong>.",
                "Creer mon compte et rejoindre",
                registerUrl,
                "Ce lien expire dans 72 heures et ne peut etre utilise qu'une seule fois."
        );
        return new RenderedEmail(subject, html);
    }

    private Sprint sampleSprint() {
        Project project = Project.builder().nom("AgileFlow Platform").build();
        return Sprint.builder()
                .nom("Sprint 5")
                .dateDebut(LocalDate.now())
                .dateFin(LocalDate.now().plusDays(14))
                .capacitePoints(30)
                .project(project)
                .build();
    }

    private Task sampleTask() {
        Sprint sprint = sampleSprint();
        return Task.builder()
                .titre("Finaliser les emails enrichis")
                .description("Mettre a jour les preferences et les templates HTML.")
                .priorite(Task.Priorite.HIGH)
                .statut(Task.Statut.TODO)
                .dateEcheance(LocalDateTime.now().plusDays(3))
                .sprint(sprint)
                .build();
    }

    private String resolveProjectName(Task task) {
        String projectName = "Projet AgileFlow";
        if (task.getSprint() != null && task.getSprint().getProject() != null && task.getSprint().getProject().getNom() != null) {
            projectName = task.getSprint().getProject().getNom();
        } else if (task.getStory() != null
                && task.getStory().getBacklog() != null
                && task.getStory().getBacklog().getProject() != null
                && task.getStory().getBacklog().getProject().getNom() != null) {
            projectName = task.getStory().getBacklog().getProject().getNom();
        }
        return projectName;
    }

    private String fullName(User user) {
        if (user == null) {
            return "Utilisateur";
        }
        String value = ((user.getPrenom() != null ? user.getPrenom() : "") + " " + (user.getNom() != null ? user.getNom() : "")).trim();
        return value.isBlank() ? user.getEmail() : value;
    }

    private String baseProjectEmail(String title, String greeting, String body, String ctaLabel, String ctaUrl, String footer) {
        return baseEmail(
                title,
                "AgileFlow",
                BRAND_GRADIENT,
                greeting,
                """
                        <p style="margin:0 0 24px;line-height:1.65;color:#374151;">%s</p>
                        """.formatted(body),
                ctaLabel,
                ctaUrl,
                footer
        );
    }

    private String baseEmail(String title, String eyebrow, String headerBackground, String greeting, String contentHtml, String ctaLabel, String ctaUrl, String footer) {
        String cta = ctaUrl == null || ctaUrl.isBlank() ? "" : """
                <a href="%s" style="display:inline-block;padding:12px 18px;background:#2563eb;color:#ffffff;text-decoration:none;border-radius:10px;font-weight:800;">
                  %s
                </a>
                """.formatted(ctaUrl, escape(ctaLabel));
        return """
                <html>
                  <body style="margin:0;padding:24px;background:#f3f4f6;font-family:Arial,Helvetica,sans-serif;color:#111827;">
                    <table role="presentation" style="width:100%%;max-width:660px;margin:0 auto;background:#ffffff;border-radius:18px;overflow:hidden;border:1px solid #e5e7eb;box-shadow:0 20px 45px rgba(15,23,42,0.08);">
                      <tr>
                        <td style="padding:24px 28px;background:%s;color:#ffffff;">
                          <table role="presentation" style="width:100%%;border-collapse:collapse;">
                            <tr>
                              <td style="width:54px;vertical-align:middle;">
                                <img src="cid:agileflowLogo" alt="AgileFlow" width="44" height="44" style="display:block;border-radius:10px;background:#ffffff;padding:4px;">
                              </td>
                              <td style="vertical-align:middle;">
                                <div style="font-size:12px;letter-spacing:1px;text-transform:uppercase;opacity:.9;font-weight:800;">%s</div>
                                <h1 style="margin:6px 0 0;font-size:24px;line-height:1.3;">%s</h1>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:28px;">
                          <p style="margin:0 0 16px;color:#111827;font-weight:700;">%s</p>
                          %s
                          %s
                          <p style="margin:24px 0 0;color:#6b7280;font-size:13px;line-height:1.6;">%s</p>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:18px 28px;background:#f8fafc;border-top:1px solid #e5e7eb;color:#94a3b8;font-size:12px;">
                          AgileFlow - Gestion agile, GitHub, Kanban, Chronologie et DiagramFlow.
                        </td>
                      </tr>
                    </table>
                  </body>
                </html>
                """.formatted(
                headerBackground,
                escape(eyebrow),
                escape(title),
                greeting,
                contentHtml,
                cta,
                escape(footer)
        );
    }

    private String detailsTable(String[][] rows) {
        StringBuilder builder = new StringBuilder("""
                <table role="presentation" style="width:100%;border-collapse:collapse;margin:0 0 4px;">
                """);
        for (String[] row : rows) {
            builder.append("""
                    <tr>
                      <td style="padding:12px 0;border-bottom:1px solid #e5e7eb;color:#64748b;width:160px;">%s</td>
                      <td style="padding:12px 0;border-bottom:1px solid #e5e7eb;color:#111827;"><strong>%s</strong></td>
                    </tr>
                    """.formatted(escape(row[0]), row[1] == null ? "" : row[1]));
        }
        builder.append("</table>");
        return builder.toString();
    }

    private String joinUrl(String base, String path) {
        String safeBase = base == null || base.isBlank() ? "http://localhost:5173" : base.replaceAll("/+$", "");
        String safePath = path == null || path.isBlank() ? "" : path;
        if (!safePath.startsWith("/")) {
            safePath = "/" + safePath;
        }
        return safeBase + safePath;
    }

    private String escape(String value) {
        if (value == null) {
            return "";
        }
        return value
                .replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;")
                .replace("\"", "&quot;");
    }

    private String formatDate(LocalDate date) {
        return date != null ? date.atStartOfDay().format(DATE_TIME_FORMAT) : "Non definie";
    }

    private String formatDateTime(LocalDateTime dateTime) {
        return dateTime != null ? dateTime.format(DATE_TIME_FORMAT) : "Non definie";
    }

    public record RenderedEmail(String subject, String html) {
    }
}
