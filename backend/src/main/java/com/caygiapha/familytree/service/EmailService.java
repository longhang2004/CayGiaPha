package com.caygiapha.familytree.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

import jakarta.mail.internet.MimeMessage;

/**
 * Thin wrapper around Spring Mail. When {@code app.mail.enabled=false} (default), messages are
 * logged only so local/dev environments work without SMTP credentials.
 */
@Service
public class EmailService {

    private static final Logger log = LoggerFactory.getLogger(EmailService.class);

    private final JavaMailSender mailSender;
    private final boolean enabled;
    private final String fromAddress;

    public EmailService(
            JavaMailSender mailSender,
            @Value("${app.mail.enabled:false}") boolean enabled,
            @Value("${app.mail.from:}") String fromAddress) {
        this.mailSender = mailSender;
        this.enabled = enabled;
        this.fromAddress = fromAddress == null ? "" : fromAddress.trim();
    }

    public void sendHtml(String to, String subject, String text, String html) {
        if (to == null || to.isBlank()) {
            return;
        }
        if (!enabled) {
            log.info("[EMAIL-MOCK] to={} subject={}", to, subject);
            return;
        }
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
            log.info("Sent email to {} subject={}", to, subject);
        } catch (Exception ex) {
            log.error("Failed to send email to {}: {}", to, ex.getMessage());
            throw new IllegalStateException("Email sending failed: " + ex.getMessage(), ex);
        }
    }

    public void sendText(String to, String subject, String text) {
        if (to == null || to.isBlank()) {
            return;
        }
        if (!enabled) {
            log.info("[EMAIL-MOCK] to={} subject={}", to, subject);
            return;
        }
        SimpleMailMessage message = new SimpleMailMessage();
        if (!fromAddress.isBlank()) {
            message.setFrom(fromAddress);
        }
        message.setTo(to.trim());
        message.setSubject(subject);
        message.setText(text == null ? "" : text);
        mailSender.send(message);
    }
}
