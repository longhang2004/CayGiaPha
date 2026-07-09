package com.caygiapha.familytree.config;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.springframework.mail.javamail.JavaMailSenderImpl;

class MailConfigSmokeTest {

    @Test
    void buildsSenderFromEmailEnvStyleProperties() {
        MailConfig config = new MailConfig();
        JavaMailSenderImpl sender = (JavaMailSenderImpl) config.javaMailSender(
                "smtp.gmail.com",
                587,
                "user@gmail.com",
                "app-password",
                true,
                true,
                true);
        assertThat(sender.getHost()).isEqualTo("smtp.gmail.com");
        assertThat(sender.getPort()).isEqualTo(587);
        assertThat(sender.getUsername()).isEqualTo("user@gmail.com");
        assertThat(sender.getJavaMailProperties().getProperty("mail.smtp.starttls.enable"))
                .isEqualTo("true");
    }

    @Test
    void emptyHostFallsBackToLocalhostButIsDetectable() {
        MailConfig config = new MailConfig();
        JavaMailSenderImpl sender = (JavaMailSenderImpl) config.javaMailSender(
                "", 587, "", "", true, true, false);
        assertThat(sender.getHost()).isEqualTo("localhost");
    }
}
