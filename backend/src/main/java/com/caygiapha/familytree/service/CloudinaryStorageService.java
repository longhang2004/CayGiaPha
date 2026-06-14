package com.caygiapha.familytree.service;

import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;
import com.caygiapha.familytree.error.ApiException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.Map;

/**
 * Cloudinary-backed implementation of {@link StorageService} (Requirement 24.7 / Optional Extension).
 * Activated by setting {@code app.storage.type=cloudinary} in configuration.
 *
 * <p>Retrieval requests download the secure image URL via standard HttpClient,
 * which maintains the backend-mediated gated serving architecture.
 */
@Service
@ConditionalOnProperty(name = "app.storage.type", havingValue = "cloudinary")
public class CloudinaryStorageService implements StorageService {

    private final Cloudinary cloudinary;
    private final HttpClient httpClient;

    public CloudinaryStorageService(
            @Value("${app.cloudinary.url:}") String cloudinaryUrl,
            @Value("${app.cloudinary.cloud-name:}") String cloudName,
            @Value("${app.cloudinary.api-key:}") String apiKey,
            @Value("${app.cloudinary.api-secret:}") String apiSecret) {

        if (cloudinaryUrl != null && !cloudinaryUrl.isBlank()) {
            this.cloudinary = new Cloudinary(cloudinaryUrl);
        } else if (cloudName != null && !cloudName.isBlank() && apiKey != null && !apiKey.isBlank() && apiSecret != null && !apiSecret.isBlank()) {
            this.cloudinary = new Cloudinary(ObjectUtils.asMap(
                    "cloud_name", cloudName,
                    "api_key", apiKey,
                    "api_secret", apiSecret,
                    "secure", true
            ));
        } else {
            throw new IllegalArgumentException("Cloudinary configuration is missing. " +
                    "Provide either app.cloudinary.url (CLOUDINARY_URL) or app.cloudinary.cloud-name, api-key, and api-secret.");
        }
        this.httpClient = HttpClient.newHttpClient();
    }

    @Override
    public void put(String key, byte[] content, String contentType) {
        try {
            // Upload to Cloudinary using key as public_id
            cloudinary.uploader().upload(content, ObjectUtils.asMap(
                    "public_id", key,
                    "overwrite", true,
                    "resource_type", "image"
            ));
        } catch (IOException e) {
            throw new RuntimeException("Failed to upload image to Cloudinary under key: " + key, e);
        }
    }

    @Override
    public byte[] get(String key) {
        try {
            // Cloudinary serving works by generating the URL and then downloading the bytes
            String url = cloudinary.url().secure(true).generate(key);
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    .GET()
                    .build();
            HttpResponse<byte[]> response = httpClient.send(request, HttpResponse.BodyHandlers.ofByteArray());
            if (response.statusCode() != 200) {
                throw ApiException.nodeNotAccessible("The requested image is not available.");
            }
            return response.body();
        } catch (IOException | InterruptedException e) {
            if (e instanceof InterruptedException) {
                Thread.currentThread().interrupt();
            }
            throw ApiException.nodeNotAccessible("The requested image could not be retrieved.");
        }
    }

    @Override
    public void delete(String key) {
        try {
            cloudinary.uploader().destroy(key, ObjectUtils.emptyMap());
        } catch (IOException e) {
            throw new RuntimeException("Failed to delete image from Cloudinary with key: " + key, e);
        }
    }
}
