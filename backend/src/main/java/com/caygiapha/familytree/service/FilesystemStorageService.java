package com.caygiapha.familytree.service;

import com.caygiapha.familytree.error.ApiException;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.Path;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

/**
 * Default {@link StorageService} that writes objects to a local base directory (Requirement 24.7).
 * Object bytes never enter the relational database; this keeps the implementation dependency-free
 * and fully testable. A production deployment can replace this bean with an S3-compatible
 * implementation pointed at the MinIO/bucket in {@code docker-compose.yml}.
 *
 * <p>Keys are treated as relative paths under the base directory. Keys are sanitized to forbid
 * absolute paths and parent-directory traversal ({@code ..}), so a caller-supplied key can never
 * escape the base directory.
 */
@Service
@ConditionalOnProperty(name = "app.storage.type", havingValue = "filesystem", matchIfMissing = true)
public class FilesystemStorageService implements StorageService {

    private final Path baseDir;

    public FilesystemStorageService(
            @Value("${app.storage.dir:${java.io.tmpdir}/caygiapha-photos}") String baseDir) {
        this.baseDir = Path.of(baseDir).toAbsolutePath().normalize();
    }

    @Override
    public void put(String key, byte[] content, String contentType) {
        Path target = resolve(key);
        try {
            Files.createDirectories(target.getParent());
            Files.write(target, content);
        } catch (IOException e) {
            throw new UncheckedIOException("Failed to store object " + key, e);
        }
    }

    @Override
    public byte[] get(String key) {
        Path target = resolve(key);
        try {
            return Files.readAllBytes(target);
        } catch (IOException e) {
            throw ApiException.nodeNotAccessible("The requested image is not available.");
        }
    }

    @Override
    public void delete(String key) {
        try {
            Files.deleteIfExists(resolve(key));
        } catch (IOException e) {
            throw new UncheckedIOException("Failed to delete object " + key, e);
        }
    }

    /** Resolve a key to a path under the base dir, rejecting traversal/absolute keys. */
    private Path resolve(String key) {
        if (key == null || key.isBlank()) {
            throw ApiException.validation("objectKey", "A storage key is required.");
        }
        Path resolved = baseDir.resolve(key).normalize();
        if (!resolved.startsWith(baseDir)) {
            throw ApiException.validation("objectKey", "Invalid storage key.");
        }
        return resolved;
    }
}
