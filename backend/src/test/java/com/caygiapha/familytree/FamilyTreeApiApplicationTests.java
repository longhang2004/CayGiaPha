package com.caygiapha.familytree;

import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIf;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ActiveProfiles;
import org.testcontainers.DockerClientFactory;

/**
 * Verifies the Spring application context starts against a Testcontainers PostgreSQL instance
 * with Flyway migrations applied. Tagged {@code integration} because it requires Docker.
 */
@SpringBootTest
@Import(TestcontainersConfiguration.class)
@ActiveProfiles("test")
@Tag("integration")
@EnabledIf("com.caygiapha.familytree.FamilyTreeApiApplicationTests#testcontainersDockerAvailable")
class FamilyTreeApiApplicationTests {

    @Test
    void contextLoads() {
        // Context startup (DataSource + Flyway + JPA validation) is the assertion.
    }

    static boolean testcontainersDockerAvailable() {
        try {
            return DockerClientFactory.instance().isDockerAvailable();
        } catch (RuntimeException ex) {
            return false;
        }
    }
}
