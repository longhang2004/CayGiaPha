package com.caygiapha.familytree.config;

import java.util.Properties;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.JavaMailSenderImpl;
import org.springframework.util.StringUtils;

/**
 * Builds {@link JavaMailSender} from {@code EMAIL_*} / {@code spring.mail.*} properties.
 *
 * <p>Spring Boot's default mail auto-config leaves host empty when env is missing, which silently
 * becomes {@code localhost:25}. This bean always resolves host/port/credentials explicitly and logs
 * the effective SMTP target at startup.
 */
@Configuration
public class MailConfig {

    private static final Logger log = LoggerFactory.getLogger(MailConfig.class);

    @Bean
    @Primary
    public JavaMailSender javaMailSender(
            @Value("${EMAIL_HOST:${spring.mail.host:}}") String host,
            @Value("${EMAIL_PORT:${spring.mail.port:587}}") int port,
            @Value("${EMAIL_USER:${spring.mail.username:}}") String username,
            @Value("${EMAIL_PASS:${spring.mail.password:}}") String password,
            @Value("${EMAIL_SMTP_AUTH:true}") boolean smtpAuth,
            @Value("${EMAIL_SMTP_STARTTLS:true}") boolean startTls,
            @Value("${EMAIL_ENABLED:false}") boolean enabled) {
        JavaMailSenderImpl sender = new JavaMailSenderImpl();
        String resolvedHost = StringUtils.hasText(host) ? host.trim() : "";
        sender.setHost(resolvedHost.isEmpty() ? "localhost" : resolvedHost);
        sender.setPort(port > 0 ? port : 587);
        if (StringUtils.hasText(username)) {
            sender.setUsername(username.trim());
        }
        if (StringUtils.hasText(password)) {
            sender.setPassword(password);
        }

        Properties props = sender.getJavaMailProperties();
        props.put("mail.transport.protocol", "smtp");
        props.put("mail.smtp.auth", Boolean.toString(smtpAuth && StringUtils.hasText(username)));
        props.put("mail.smtp.starttls.enable", Boolean.toString(startTls));
        props.put("mail.smtp.starttls.required", Boolean.toString(startTls));
        props.put("mail.smtp.connectiontimeout", "10000");
        props.put("mail.smtp.timeout", "10000");
        props.put("mail.smtp.writetimeout", "10000");
        // Port 465 uses implicit SSL (often works when 587 STARTTLS is blocked).
        if (port == 465) {
            props.put("mail.smtp.ssl.enable", "true");
            props.put("mail.smtp.socketFactory.port", "465");
            props.put("mail.smtp.socketFactory.class", "javax.net.ssl.SSLSocketFactory");
            props.put("mail.smtp.starttls.enable", "false");
            props.put("mail.smtp.starttls.required", "false");
        }

        if (enabled && resolvedHost.isEmpty()) {
            log.warn(
                    "EMAIL_ENABLED=true but EMAIL_HOST empty. Prefer RESEND_API_KEY on cloud hosts, "
                            + "or set EMAIL_HOST=smtp.gmail.com / EMAIL_PORT=465.");
        } else if (enabled) {
            log.info(
                    "SMTP configured: host={} port={} user={} starttls={} (cloud tip: use RESEND_API_KEY if SMTP times out)",
                    resolvedHost,
                    sender.getPort(),
                    StringUtils.hasText(username) ? username : "<none>",
                    port != 465 && startTls);
        } else {
            log.info(
                    "SMTP bean ready (host={}) but EMAIL_ENABLED=false — outbound mail is mocked.",
                    resolvedHost.isEmpty() ? "<unset>" : resolvedHost);
        }
        return sender;
    }
}
