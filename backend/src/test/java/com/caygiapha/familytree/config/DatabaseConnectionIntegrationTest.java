package com.caygiapha.familytree.config;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.ResultSet;
import java.sql.Statement;
import static org.junit.jupiter.api.Assertions.*;

/**
 * Verifies live database connectivity using the active DataSource config.
 * Avoids Testcontainers to test the actual configured host connection (e.g. Supabase).
 */
@SpringBootTest
class DatabaseConnectionIntegrationTest {

    @Autowired
    private DataSource dataSource;

    @Test
    void testConnection() throws Exception {
        System.out.println("Verifying database connectivity...");
        assertNotNull(dataSource, "DataSource should not be null!");
        
        try (Connection conn = dataSource.getConnection();
             Statement stmt = conn.createStatement();
             ResultSet rs = stmt.executeQuery("SELECT 1")) {
            
            assertTrue(rs.next());
            assertEquals(1, rs.getInt(1));
            System.out.println("Database connection test succeeded!");
            System.out.println("Database metadata URL: " + conn.getMetaData().getURL());
            System.out.println("Database metadata User: " + conn.getMetaData().getUserName());
        }
    }
}
