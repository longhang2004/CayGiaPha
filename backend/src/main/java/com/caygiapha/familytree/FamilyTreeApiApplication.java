package com.caygiapha.familytree;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.security.servlet.UserDetailsServiceAutoConfiguration;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;
import org.springframework.scheduling.annotation.EnableScheduling;

/**
 * Entry point for the Vietnamese Family Tree (Cay Gia Pha) REST API.
 *
 * <p>The backend is a modular hexagonal monolith: controller/service/repository remain the
 * product application layer. Portfolio infrastructure lives under {@code platform} and
 * {@code hexagon}. See {@code docs/adr/0001-hexagonal-modular-monolith.md}.
 */
@SpringBootApplication(exclude = UserDetailsServiceAutoConfiguration.class)
@ConfigurationPropertiesScan
@EnableScheduling
public class FamilyTreeApiApplication {

    public static void main(String[] args) {
        SpringApplication.run(FamilyTreeApiApplication.class, args);
    }
}
