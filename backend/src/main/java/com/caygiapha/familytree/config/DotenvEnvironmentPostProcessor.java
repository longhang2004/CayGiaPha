package com.caygiapha.familytree.config;

import java.io.BufferedReader;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.HashMap;
import java.util.Map;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.env.EnvironmentPostProcessor;
import org.springframework.core.Ordered;
import org.springframework.core.env.ConfigurableEnvironment;
import org.springframework.core.env.MapPropertySource;
import org.springframework.core.env.Profiles;

/**
 * Loads {@code backend/.env} / {@code backend/.env.local} / {@code backend/.env.production} into the
 * Spring Environment when present, so local and container runs can share the same dotenv files as
 * the frontend without requiring a shell {@code export}. Existing OS/env vars always win.
 */
public class DotenvEnvironmentPostProcessor implements EnvironmentPostProcessor, Ordered {

    @Override
    public void postProcessEnvironment(
            ConfigurableEnvironment environment, SpringApplication application) {
        // Test profiles obtain isolated connection details from Testcontainers. Local dotenv
        // files must not override those details or make tests depend on developer credentials.
        if (environment.acceptsProfiles(Profiles.of("test"))) {
            return;
        }
        for (String name : new String[] {".env", ".env.local", ".env.production"}) {
            Path path = Path.of(name);
            if (!Files.isRegularFile(path)) {
                // Also try parent (when cwd is repo root and jar runs from backend/)
                path = Path.of("backend", name);
            }
            if (!Files.isRegularFile(path)) {
                continue;
            }
            Map<String, Object> loaded = loadDotenv(path);
            if (!loaded.isEmpty()) {
                // High enough to resolve ${EMAIL_*} placeholders in application.yml, but still
                // below real OS environment variables (checked in loadDotenv).
                environment
                        .getPropertySources()
                        .addFirst(new MapPropertySource("dotenv:" + path, loaded));
            }
        }
    }

    private static Map<String, Object> loadDotenv(Path path) {
        Map<String, Object> map = new HashMap<>();
        try (BufferedReader reader = Files.newBufferedReader(path, StandardCharsets.UTF_8)) {
            String line;
            while ((line = reader.readLine()) != null) {
                line = line.trim();
                if (line.isEmpty() || line.startsWith("#")) {
                    continue;
                }
                int eq = line.indexOf('=');
                if (eq <= 0) {
                    continue;
                }
                String key = line.substring(0, eq).trim();
                String value = line.substring(eq + 1).trim();
                if ((value.startsWith("\"") && value.endsWith("\""))
                        || (value.startsWith("'") && value.endsWith("'"))) {
                    value = value.substring(1, value.length() - 1);
                }
                // Do not override real environment variables.
                if (System.getenv(key) == null) {
                    map.put(key, value);
                    // Also mirror common EMAIL_* keys into spring.mail.* for Boot auto-config.
                    switch (key) {
                        case "EMAIL_HOST" -> map.putIfAbsent("spring.mail.host", value);
                        case "EMAIL_PORT" -> map.putIfAbsent("spring.mail.port", value);
                        case "EMAIL_USER" -> map.putIfAbsent("spring.mail.username", value);
                        case "EMAIL_PASS" -> map.putIfAbsent("spring.mail.password", value);
                        default -> {
                            // no-op
                        }
                    }
                }
            }
        } catch (IOException ignored) {
            // Optional file — skip on read errors.
        }
        return map;
    }

    @Override
    public int getOrder() {
        // Before ConfigData (application.yml) so ${EMAIL_HOST} placeholders resolve.
        return Ordered.HIGHEST_PRECEDENCE + 10;
    }
}
