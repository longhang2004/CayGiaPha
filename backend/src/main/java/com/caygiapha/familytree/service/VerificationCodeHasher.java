package com.caygiapha.familytree.service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.util.Base64;
import org.springframework.stereotype.Component;

/**
 * Hashes verification codes so the plaintext is never stored at rest (design Security
 * Considerations; Requirements 1.4, 2.2, 11.4).
 *
 * <p>Each code is hashed with a fresh 16-byte random salt using SHA-256 over {@code salt || code}.
 * The persisted value encodes both parts as {@code base64(salt):base64(digest)} so verification can
 * recompute the digest with the stored salt. Verification uses a constant-time comparison to avoid
 * leaking information through timing.
 *
 * <p>This is dependency-free (JDK {@link MessageDigest}); a stronger KDF could be substituted later
 * without changing callers, since the stored format is self-describing.
 */
@Component
public class VerificationCodeHasher {

    private static final String DIGEST_ALGORITHM = "SHA-256";
    private static final int SALT_BYTES = 16;
    private static final String SEPARATOR = ":";

    private final SecureRandom secureRandom = new SecureRandom();
    private final Base64.Encoder encoder = Base64.getEncoder();
    private final Base64.Decoder decoder = Base64.getDecoder();

    /**
     * Hash a plaintext code with a fresh random salt.
     *
     * @return the encoded {@code base64(salt):base64(digest)} string to persist in {@code code_hash}
     */
    public String hash(String code) {
        byte[] salt = new byte[SALT_BYTES];
        secureRandom.nextBytes(salt);
        byte[] digest = digest(salt, code);
        return encoder.encodeToString(salt) + SEPARATOR + encoder.encodeToString(digest);
    }

    /**
     * Verify a submitted plaintext code against a previously stored hash.
     *
     * @param submitted  the plaintext code from the user
     * @param storedHash the value previously produced by {@link #hash(String)}
     * @return {@code true} iff the submitted code matches the stored hash
     */
    public boolean matches(String submitted, String storedHash) {
        if (submitted == null || storedHash == null) {
            return false;
        }
        int sep = storedHash.indexOf(SEPARATOR);
        if (sep < 0) {
            return false;
        }
        byte[] salt;
        byte[] expected;
        try {
            salt = decoder.decode(storedHash.substring(0, sep));
            expected = decoder.decode(storedHash.substring(sep + 1));
        } catch (IllegalArgumentException ex) {
            return false;
        }
        byte[] actual = digest(salt, submitted);
        return MessageDigest.isEqual(expected, actual);
    }

    private byte[] digest(byte[] salt, String code) {
        try {
            MessageDigest md = MessageDigest.getInstance(DIGEST_ALGORITHM);
            md.update(salt);
            md.update(code.getBytes(StandardCharsets.UTF_8));
            return md.digest();
        } catch (NoSuchAlgorithmException ex) {
            // SHA-256 is guaranteed present on every JVM; this cannot happen in practice.
            throw new IllegalStateException("SHA-256 digest algorithm is unavailable", ex);
        }
    }
}
