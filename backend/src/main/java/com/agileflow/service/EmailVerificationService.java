package com.agileflow.service;

import com.agileflow.entity.User;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ClassPathResource;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

@Service
@RequiredArgsConstructor
public class EmailVerificationService {

    private final JavaMailSender mailSender;

    @Value("${spring.mail.username}")
    private String fromEmail;

    @Value("${app.mail.from-name:AgileFlow Support}")
    private String fromName;

    @Value("${app.frontend-url:http://localhost:5173}")
    private String frontendUrl;

    public void sendVerificationCode(User user, String otp, LocalDateTime expiresAt) {
        sendOtpEmail(user, otp, expiresAt, "Code de verification AgileFlow", buildVerificationHtml(user, otp, expiresAt));
    }

    public void sendPasswordResetCode(User user, String otp, LocalDateTime expiresAt) {
        sendOtpEmail(user, otp, expiresAt, "Reinitialisation de mot de passe AgileFlow", buildPasswordResetHtml(user, otp, expiresAt));
    }

    private void sendOtpEmail(User user, String otp, LocalDateTime expiresAt, String subject, String html) {
        try {
            MimeMessage mimeMessage = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(mimeMessage, true, "UTF-8");
            helper.setFrom(fromName + " <" + fromEmail + ">");
            helper.setTo(user.getEmail());
            helper.setSubject(subject);
            helper.setText(html, true);
            helper.addInline("agileflowLogo", new ClassPathResource("static/agileflow-icon.png"), "image/png");
            mailSender.send(mimeMessage);
        } catch (Exception ex) {
            throw new RuntimeException("Impossible d'envoyer le code par email.", ex);
        }
    }

    private String buildPasswordResetHtml(User user, String otp, LocalDateTime expiresAt) {
        String name = user.getPrenom() == null || user.getPrenom().isBlank() ? "Utilisateur" : user.getPrenom();
        String expires = expiresAt.format(DateTimeFormatter.ofPattern("HH:mm"));
        return buildOtpHtml(
                "Reinitialisation du mot de passe",
                "Securite",
                "Bonjour " + escape(name) + ",",
                "Utilisez ce code pour definir un nouveau mot de passe sur AgileFlow.",
                otp,
                "Ce code expire a " + expires + ". Si vous n'avez pas demande cette reinitialisation, ignorez cet email."
        );
    }

    private String buildVerificationHtml(User user, String otp, LocalDateTime expiresAt) {
        String name = user.getPrenom() == null || user.getPrenom().isBlank() ? "Utilisateur" : user.getPrenom();
        String expires = expiresAt.format(DateTimeFormatter.ofPattern("HH:mm"));
        return buildOtpHtml(
                "Verification de votre email",
                "Activation du compte",
                "Bonjour " + escape(name) + ",",
                "Utilisez ce code pour activer votre compte AgileFlow.",
                otp,
                "Ce code expire a " + expires + ". Si vous n'avez pas demande cette inscription, ignorez cet email."
        );
    }

    private String buildOtpHtml(String title, String eyebrow, String greeting, String message, String otp, String footer) {
        return """
                <html>
                  <body style="margin:0;padding:24px;background:#f3f4f6;font-family:Arial,Helvetica,sans-serif;color:#111827;">
                    <table role="presentation" style="width:100%%;max-width:620px;margin:0 auto;background:#ffffff;border-radius:18px;overflow:hidden;border:1px solid #e5e7eb;box-shadow:0 20px 45px rgba(15,23,42,0.08);">
                      <tr>
                        <td style="padding:24px 28px;background:linear-gradient(135deg,#2563eb 0%%,#7c3aed 100%%);color:#ffffff;">
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
                          <p style="margin:0 0 22px;line-height:1.65;color:#374151;">%s</p>
                          <div style="font-size:34px;font-weight:900;letter-spacing:10px;color:#2563eb;background:#eff6ff;border:1px solid #bfdbfe;border-radius:14px;text-align:center;padding:18px;margin:0 0 22px;">%s</div>
                          <p style="margin:0;color:#64748b;font-size:13px;line-height:1.6;">%s</p>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:18px 28px;background:#f8fafc;border-top:1px solid #e5e7eb;color:#94a3b8;font-size:12px;">
                          AgileFlow - Code personnel et temporaire.
                        </td>
                      </tr>
                    </table>
                  </body>
                </html>
                """.formatted(escape(eyebrow), escape(title), greeting, escape(message), otp, escape(footer));
    }

    private String escape(String value) {
        return value
                .replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;")
                .replace("\"", "&quot;");
    }

    private String joinUrl(String base, String path) {
        String safeBase = base == null || base.isBlank() ? "http://localhost:5173" : base.replaceAll("/+$", "");
        String safePath = path == null || path.isBlank() ? "" : path;
        if (!safePath.startsWith("/")) {
            safePath = "/" + safePath;
        }
        return safeBase + safePath;
    }
}
