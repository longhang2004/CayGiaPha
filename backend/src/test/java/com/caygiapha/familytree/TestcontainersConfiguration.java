package com.caygiapha.familytree;

import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.context.annotation.Bean;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.utility.DockerImageName;

/**
 * Provides a throwaway PostgreSQL database via Testcontainers for the local and test profiles.
 *
 * <p>The {@link ServiceConnection} annotation wires the container's JDBC URL, username, and
 * password into Spring Boot's DataSource automatically, so no connection properties need to be
 * configured in {@code application-test.yml} / {@code application-local.yml}.
 */
@TestConfiguration(proxyBeanMethods = false)
public class TestcontainersConfiguration {

    @Bean
    @ServiceConnection
    PostgreSQLContainer<?> postgresContainer() {
        return new PostgreSQLContainer<>(DockerImageName.parse("postgres:16-alpine"));
    }
}
