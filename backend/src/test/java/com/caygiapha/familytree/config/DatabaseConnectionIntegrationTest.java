package com.caygiapha.familytree.config;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.caygiapha.familytree.TestcontainersConfiguration;
import java.sql.Connection;
import java.sql.ResultSet;
import java.sql.Statement;
import javax.sql.DataSource;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIf;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ActiveProfiles;
import org.testcontainers.DockerClientFactory;

/**
 * Verifies live JDBC connectivity against an isolated Testcontainers PostgreSQL instance.
 *
 * <p>This is intentionally not bound to developer {@code .env.local} / remote Supabase credentials.
 * Those host-specific smoke checks are out of the default unit/integration suite contract; the
 * repository's reliable connectivity gate is disposable Postgres via Testcontainers (same path as
 * {@code FamilyTreeApiApplicationTests} and migration tests).
 */
@SpringBootTest
@Import(TestcontainersConfiguration.class)
@ActiveProfiles("test")
@Tag("integration")
@EnabledIf("com.caygiapha.familytree.config.DatabaseConnectionIntegrationTest#testcontainersDockerAvailable")
class DatabaseConnectionIntegrationTest {

    @Autowired
    private DataSource dataSource;

    @Test
    void testConnection() throws Exception {
        assertNotNull(dataSource, "DataSource should not be null!");

        try (Connection conn = dataSource.getConnection();
                Statement stmt = conn.createStatement();
                ResultSet rs = stmt.executeQuery("SELECT 1")) {

            assertTrue(rs.next());
            assertEquals(1, rs.getInt(1));
            assertNotNull(conn.getMetaData().getURL());
        }
    }

    static boolean testcontainersDockerAvailable() {
        try {
            return DockerClientFactory.instance().isDockerAvailable();
        } catch (RuntimeException ex) {
            return false;
        }
    }
}
