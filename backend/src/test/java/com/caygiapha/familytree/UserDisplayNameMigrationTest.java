package com.caygiapha.familytree;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertThrows;

import java.util.UUID;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIf;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.testcontainers.DockerClientFactory;

@SpringBootTest
@Import(TestcontainersConfiguration.class)
@ActiveProfiles("test")
@Tag("integration")
@EnabledIf("com.caygiapha.familytree.UserDisplayNameMigrationTest#testcontainersDockerAvailable")
class UserDisplayNameMigrationTest {

    @Autowired
    private JdbcTemplate jdbc;

    @Test
    void nullableLegacyRowsAndNormalizedUnicodeNamesAreAccepted() {
        assertDoesNotThrow(() -> insert(null));
        assertDoesNotThrow(() -> insert("Nguyễn Văn An"));
        assertDoesNotThrow(() -> insert("😀".repeat(100)));
    }

    @Test
    void databaseRejectsNonCanonicalOrInvalidNames() {
        assertThrows(DataIntegrityViolationException.class, () -> insert(""));
        assertThrows(DataIntegrityViolationException.class, () -> insert(" Nguyễn Văn An"));
        assertThrows(DataIntegrityViolationException.class, () -> insert("Nguyễn  Văn An"));
        assertThrows(DataIntegrityViolationException.class, () -> insert("Nguyễn\nVăn An"));
        assertThrows(DataIntegrityViolationException.class, () -> insert("a".repeat(101)));
    }

    private void insert(String displayName) {
        jdbc.update(
                "INSERT INTO users (id, email, display_name, verified) VALUES (?, ?, ?, true)",
                UUID.randomUUID(),
                UUID.randomUUID() + "@example.test",
                displayName);
    }

    static boolean testcontainersDockerAvailable() {
        try {
            return DockerClientFactory.instance().isDockerAvailable();
        } catch (RuntimeException ex) {
            return false;
        }
    }
}
