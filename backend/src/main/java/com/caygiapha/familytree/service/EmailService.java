package com.caygiapha.familytree.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.JavaMailSenderImpl;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import jakarta.mail.internet.MimeMessage;

/**
 * Outbound email. Prefer Resend HTTPS API when {@code RESEND_API_KEY} is set (works on hosts that
 * block SMTP ports 25/465/587). Otherwise fall back to Spring {@link JavaMailSender} SMTP.
 */
@Service
public class EmailService {

    private static final Logger log = LoggerFactory.getLogger(EmailService.class);
    private static final URI RESEND_URI = URI.create("https://api.resend.com/emails");

    private final JavaMailSender mailSender;
    private final boolean enabled;
    private final String fromAddress;
    private final String resendApiKey;
    private final HttpClient httpClient;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public EmailService(
            JavaMailSender mailSender,
            @Value("${app.mail.enabled:false}") boolean enabled,
            @Value("${app.mail.from:}") String fromAddress,
            @Value("${spring.mail.username:}") String mailUsername,
            @Value("${RESEND_API_KEY:}") String resendApiKey) {
        this.mailSender = mailSender;
        this.enabled = enabled;
        this.fromAddress = resolveFrom(fromAddress, mailUsername);
        this.resendApiKey = resendApiKey == null ? "" : resendApiKey.trim();
        this.httpClient = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(15)).build();

        if (enabled) {
            if (StringUtils.hasText(this.resendApiKey)) {
                log.info("Email delivery ENABLED via Resend HTTPS API (from={})", this.fromAddress);
            } else {
                String host = mailSender instanceof JavaMailSenderImpl impl ? impl.getHost() : "?";
                log.info(
                        "Email delivery ENABLED via SMTP (host={}, from={}). "
                                + "If connect times out on cloud hosts, set RESEND_API_KEY instead.",
                        host == null || host.isBlank() ? "<unset>" : host,
                        this.fromAddress.isBlank() ? "<default>" : this.fromAddress);
            }
        } else {
            log.warn(
                    "Email delivery DISABLED (EMAIL_ENABLED!=true). Invites will be saved but not emailed.");
        }
    }

    public boolean isEnabled() {
        return enabled;
    }

    public void sendHtml(String to, String subject, String text, String html) {
        if (to == null || to.isBlank()) {
            throw new IllegalArgumentException("Email recipient is required.");
        }
        if (!enabled) {
            log.info("[EMAIL-MOCK] to={} subject={}", to, subject);
            return;
        }
        if (StringUtils.hasText(resendApiKey)) {
            sendViaResend(to, subject, text, html);
            return;
        }
        sendViaSmtp(to, subject, text, html);
    }

    public void sendText(String to, String subject, String text) {
        sendHtml(to, subject, text, null);
    }

    private void sendViaResend(String to, String subject, String text, String html) {
        if (!StringUtils.hasText(fromAddress)) {
            throw new IllegalStateException(
                    "EMAIL_FROM is required when using Resend. Example: Cây Gia Phả <onboarding@resend.dev>");
        }
        try {
            Map<String, Object> body = new LinkedHashMap<>();
            body.put("from", fromAddress);
            body.put("to", List.of(to.trim()));
            body.put("subject", subject);
            if (StringUtils.hasText(html)) {
                body.put("html", html);
            }
            if (StringUtils.hasText(text)) {
                body.put("text", text);
            }
            String json = objectMapper.writeValueAsString(body);
            HttpRequest request = HttpRequest.newBuilder(RESEND_URI)
                    .timeout(Duration.ofSeconds(20))
                    .header("Authorization", "Bearer " + resendApiKey)
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(json, StandardCharsets.UTF_8))
                    .build();
            HttpResponse<String> response =
                    httpClient.send(request, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
            if (response.statusCode() >= 200 && response.statusCode() < 300) {
                log.info("Sent email via Resend to {} subject={} status={}", to, subject, response.statusCode());
                return;
            }
            throw new IllegalStateException(
                    "Resend API HTTP " + response.statusCode() + ": " + truncate(response.body(), 300));
        } catch (IllegalStateException ex) {
            throw ex;
        } catch (Exception ex) {
            log.error("Resend email failed to {}: {}", to, ex.getMessage(), ex);
            throw new IllegalStateException("Email sending failed (Resend): " + ex.getMessage(), ex);
        }
    }

    private void sendViaSmtp(String to, String subject, String text, String html) {
        assertSmtpConfigured();
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            if (!fromAddress.isBlank()) {
                helper.setFrom(fromAddress);
            }
            helper.setTo(to.trim());
            helper.setSubject(subject);
            helper.setText(text == null ? "" : text, html == null ? text : html);
            mailSender.send(message);
            log.info("Sent email via SMTP to {} subject={}", to, subject);
        } catch (Exception ex) {
            log.error("SMTP email failed to {}: {}", to, ex.getMessage(), ex);
            String hint = "";
            String msg = ex.getMessage() == null ? "" : ex.getMessage();
            if (msg.contains("timed out")
                    || msg.contains("Connect timed out")
                    || msg.contains("Connection refused")
                    || msg.contains("MailConnectException")) {
                hint = " Host likely blocks outbound SMTP (ports 25/465/587). "
                        + "Set RESEND_API_KEY and EMAIL_FROM for HTTPS delivery instead.";
            }
            throw new IllegalStateException("Email sending failed: " + msg + hint, ex);
        }
    }

    private void assertSmtpConfigured() {
        if (mailSender instanceof JavaMailSenderImpl impl) {
            String host = impl.getHost();
            if (host == null
                    || host.isBlank()
                    || "localhost".equalsIgnoreCase(host)
                    || "127.0.0.1".equals(host)) {
                throw new IllegalStateException(
                        "SMTP host is '"
                                + host
                                + "'. Set EMAIL_HOST=smtp.gmail.com or prefer RESEND_API_KEY for cloud hosts.");
            }
        }
    }

    static String resolveFrom(String fromAddress, String mailUsername) {
        String from = fromAddress == null ? "" : fromAddress.trim();
        if (!from.isBlank() && isPlausibleFrom(from)) {
            return from;
        }
        String user = mailUsername == null ? "" : mailUsername.trim();
        if (!user.isBlank() && user.contains("@") && user.indexOf('@') == user.lastIndexOf('@')) {
            return "Cây Gia Phả <" + user + ">";
        }
        return from;
    }

    private static boolean isPlausibleFrom(String from) {
        String addr = from;
        int lt = from.lastIndexOf('<');
        int gt = from.lastIndexOf('>');
        if (lt >= 0 && gt > lt) {
            addr = from.substring(lt + 1, gt).trim();
        }
        int at = addr.indexOf('@');
        return at > 0 && at == addr.lastIndexOf('@') && at < addr.length() - 1;
    }

    private static String truncate(String s, int max) {
        if (s == null) {
            return "";
        }
        return s.length() <= max ? s : s.substring(0, max) + "...";
    }
}
