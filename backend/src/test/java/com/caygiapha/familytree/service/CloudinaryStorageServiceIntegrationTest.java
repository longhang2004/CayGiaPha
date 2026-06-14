package com.caygiapha.familytree.service;

import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

/**
 * Standalone integration test for CloudinaryStorageService.
 * Instantiates the service directly from environment variables,
 * avoiding the need to load the full Spring context or Docker.
 */
class CloudinaryStorageServiceIntegrationTest {

    @Test
    void testCloudinaryIntegration() {
        String cloudinaryUrl = System.getenv("CLOUDINARY_URL");
        if (cloudinaryUrl != null && !cloudinaryUrl.isBlank()) {
            System.out.println("CLOUDINARY_URL is present. Running integration tests...");
            CloudinaryStorageService storageService = new CloudinaryStorageService(
                    cloudinaryUrl, "", "", ""
            );
            
            String key = "test-integration-photo-" + java.util.UUID.randomUUID();
            byte[] content = java.util.Base64.getDecoder().decode(
                    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII="
            );
            
            // Put
            storageService.put(key, content, "image/png");
            
            // Get
            byte[] retrieved = storageService.get(key);
            assertArrayEquals(content, retrieved);
            
            // Delete
            storageService.delete(key);
            System.out.println("Integration tests passed successfully!");
        } else {
            System.out.println("CLOUDINARY_URL is not set. Skipping integration tests.");
        }
    }
}
