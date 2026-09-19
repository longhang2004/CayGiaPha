package com.caygiapha.familytree.platform.idempotency;

import com.caygiapha.familytree.error.ApiException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.HexFormat;
import java.util.Optional;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Stores completed write responses so retried POSTs with the same Idempotency-Key replay
 * instead of creating duplicate primitive edges.
 */
@Service
public class IdempotencyService {

    public static final Duration DEFAULT_TTL = Duration.ofHours(24);

    private final IdempotencyRecordRepository repository;
    private final Clock clock;

    public IdempotencyService(IdempotencyRecordRepository repository, Clock clock) {
        this.repository = repository;
        this.clock = clock;
    }

    @Transactional(readOnly = true)
    public Optional<IdempotencyRecord> replay(String key, UUID userId, String requestHash) {
        if (key == null || key.isBlank()) {
            return Optional.empty();
        }
        return repository.findById(key).filter(record -> {
            if (record.isExpired(Instant.now(clock))) {
                return false;
            }
            if (userId != null && record.getUserId() != null && !userId.equals(record.getUserId())) {
                throw ApiException.validation("Idempotency-Key", "Idempotency key belongs to another user.");
            }
            if (!requestHash.equals(record.getRequestHash())) {
                throw ApiException.validation("Idempotency-Key", "Idempotency key was reused with a different body.");
            }
            return true;
        });
    }

    @Transactional
    public IdempotencyRecord remember(
            String key, UUID userId, String requestHash, int status, String body) {
        IdempotencyRecord record = new IdempotencyRecord(
                key,
                userId,
                requestHash,
                status,
                body,
                Instant.now(clock).plus(DEFAULT_TTL));
        return repository.save(record);
    }

    public static String sha256(String value) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(digest.digest(value.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException ex) {
            throw new IllegalStateException("SHA-256 unavailable", ex);
        }
    }
}
