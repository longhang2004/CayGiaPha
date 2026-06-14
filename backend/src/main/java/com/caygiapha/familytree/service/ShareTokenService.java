package com.caygiapha.familytree.service;

import com.caygiapha.familytree.entity.TreeShareToken;
import com.caygiapha.familytree.repository.TreeShareTokenRepository;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Instant;
import java.util.Base64;
import java.util.HexFormat;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Issues, revokes, and resolves tree share tokens for "link" sharing (Requirement 19.4, 19.5).
 *
 * <p>A token is 32 bytes (256 bits) of {@link SecureRandom} entropy, URL-safe base64 encoded. Only
 * its SHA-256 hash is persisted; because the token is high-entropy and unguessable, an unsalted
 * SHA-256 is sufficient and — unlike the salted per-row OTP hashing — allows a direct indexed
 * lookup of a presented token. The plaintext is returned to the owner exactly once at issuance and
 * never stored.
 *
 * <p>At most one active token exists per tree: {@link #issueToken(UUID)} revokes any prior active
 * token before inserting the new one (19.5).
 */
@Service
public class ShareTokenService {

    private static final int TOKEN_BYTES = 32;

    private final TreeShareTokenRepository repository;
    private final SecureRandom secureRandom = new SecureRandom();
    private final Base64.Encoder encoder = Base64.getUrlEncoder().withoutPadding();

    public ShareTokenService(TreeShareTokenRepository repository) {
        this.repository = repository;
    }

    /**
     * Issue a fresh share token for the tree, revoking any prior active token, and return the
     * plaintext token (shown to the owner once). (19.5)
     */
    @Transactional
    public String issueToken(UUID treeId) {
        revokeActiveTokens(treeId);

        byte[] raw = new byte[TOKEN_BYTES];
        secureRandom.nextBytes(raw);
        String token = encoder.encodeToString(raw);

        repository.save(new TreeShareToken(treeId, hash(token)));
        return token;
    }

    /** Revoke the tree's active share token(s), denying further "link" access through them. (19.5) */
    @Transactional
    public void revokeToken(UUID treeId) {
        revokeActiveTokens(treeId);
    }

    /**
     * Resolve a presented plaintext token to the tree it grants read access to, or empty when the
     * token is null/blank, unknown, or revoked. (19.4)
     */
    @Transactional(readOnly = true)
    public Optional<UUID> resolveTreeId(String token) {
        if (token == null || token.isBlank()) {
            return Optional.empty();
        }
        return repository
                .findByTokenHashAndRevokedAtIsNull(hash(token))
                .map(TreeShareToken::getTreeId);
    }

    private void revokeActiveTokens(UUID treeId) {
        List<TreeShareToken> active = repository.findByTreeIdAndRevokedAtIsNull(treeId);
        Instant now = Instant.now();
        for (TreeShareToken t : active) {
            t.setRevokedAt(now);
        }
        repository.saveAll(active);
    }

    /** SHA-256 hex of the token; safe for high-entropy secrets and supports indexed lookup. */
    static String hash(String token) {
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            byte[] digest = md.digest(token.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (NoSuchAlgorithmException ex) {
            // SHA-256 is guaranteed present on every JVM; this cannot happen in practice.
            throw new IllegalStateException("SHA-256 digest algorithm is unavailable", ex);
        }
    }
}
