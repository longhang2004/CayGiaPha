package com.caygiapha.familytree;

import org.springframework.boot.SpringApplication;

/**
 * Test-classpath entry point that boots the application with the Testcontainers-backed
 * PostgreSQL instance. Use this to run the API locally against a real database without
 * installing PostgreSQL (Docker is required).
 */
public class TestFamilyTreeApiApplication {

    public static void main(String[] args) {
        SpringApplication.from(FamilyTreeApiApplication::main)
                .with(TestcontainersConfiguration.class)
                .run(args);
    }
}
