package com.agileflow.service;

import com.agileflow.entity.Project;
import com.agileflow.entity.User;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ClassPathResource;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class ProjectInvitationEmailService {

    private final JavaMailSender mailSender;

    @Value("${spring.mail.username}")
    private String fromEmail;

    @Value("${app.mail.from-name:AgileFlow Support}")
    private String fromName;

    @Value("${app.frontend-url:http://localhost:5173}")
    private String frontendUrl;

    public void sendProjectInvitation(String recipientEmail, User inviter, Project project, String token) {
        try {
            String inviteUrl = frontendUrl + "/project-invite?token=" + token;
            String inviterName = inviter.getPrenom() + " " + inviter.getNom();
            MimeMessage mimeMessage = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(mimeMessage, true, "UTF-8");
            helper.setFrom(fromName + " <" + fromEmail + ">");
            helper.setTo(recipientEmail);
            helper.setSubject("Invitation au projet " + project.getNom() + " - AgileFlow");
            helper.setText("""
                    <html>
                      <body style="margin:0;padding:24px;background:#f3f4f6;font-family:Arial,Helvetica,sans-serif;color:#111827;">
                        <table role="presentation" style="width:100%%;max-width:660px;margin:0 auto;background:#ffffff;border-radius:18px;overflow:hidden;border:1px solid #e5e7eb;box-shadow:0 20px 45px rgba(15,23,42,0.08);">
                          <tr>
                            <td style="padding:24px 28px;background:linear-gradient(135deg,#2563eb 0%%,#7c3aed 100%%);color:#ffffff;">
                              <table role="presentation" style="width:100%%;border-collapse:collapse;">
                                <tr>
                                  <td style="width:54px;vertical-align:middle;">
                                    <img src="cid:agileflowLogo" alt="AgileFlow" width="44" height="44" style="display:block;border-radius:10px;background:#ffffff;padding:4px;">
                                  </td>
                                  <td style="vertical-align:middle;">
                                    <div style="font-size:12px;letter-spacing:1px;text-transform:uppercase;opacity:.9;font-weight:800;">Invitation AgileFlow</div>
                                    <h1 style="margin:6px 0 0;font-size:24px;line-height:1.3;">Rejoindre un projet</h1>
                                  </td>
                                </tr>
                              </table>
                            </td>
                          </tr>
                          <tr>
                            <td style="padding:28px;">
                              <p style="margin:0 0 16px;color:#111827;font-weight:700;">Bonjour,</p>
                              <p style="margin:0 0 22px;line-height:1.65;color:#374151;">
                                <strong>%s</strong> vous invite a rejoindre le projet <strong>"%s"</strong> sur AgileFlow.
                              </p>
                              <a href="%s" style="display:inline-block;padding:12px 18px;background:#2563eb;color:#ffffff;text-decoration:none;border-radius:10px;font-weight:800;">
                                Accepter l'invitation
                              </a>
                              <p style="margin:24px 0 0;color:#64748b;font-size:13px;line-height:1.6;">
                                Ce lien expire dans 7 jours. Si vous n'avez pas encore de compte, inscrivez-vous avec cette adresse email puis ouvrez le lien.
                              </p>
                            </td>
                          </tr>
                          <tr>
                            <td style="padding:18px 28px;background:#f8fafc;border-top:1px solid #e5e7eb;color:#94a3b8;font-size:12px;">
                              AgileFlow - Projets, equipes, Kanban, Chronologie et GitHub.
                            </td>
                          </tr>
                        </table>
                      </body>
                    </html>
                    """.formatted(escape(inviterName), escape(project.getNom()), inviteUrl), true);
            helper.addInline("agileflowLogo", new ClassPathResource("static/agileflow-icon.png"), "image/png");
            mailSender.send(mimeMessage);
        } catch (Exception ex) {
            throw new RuntimeException("Impossible d'envoyer l'invitation par email.", ex);
        }
    }

    private String escape(String value) {
        return value
                .replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;")
                .replace("\"", "&quot;");
    }
}
