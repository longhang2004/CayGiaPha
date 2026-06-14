package com.caygiapha.familytree.service;

import java.security.SecureRandom;
import org.springframework.stereotype.Component;

/**
 * Generates the 6-digit numeric one-time codes using a cryptographically secure RNG
 * (Requirements 1.3, 2.1, 11.1; design Security Considerations).
 *
 * <p>Codes are drawn uniformly from {@code 000000}–{@code 999999} with a single {@link SecureRandom}
 * draw and zero-padded to six digits, so every value in the space (including those with leading
 * zeros) is equally likely. The generator never logs or stores the produced value; the caller
 * delivers it once and persists only a hash.
 */
@Component
public class VerificationCodeGenerator {

    /** Number of decimal digits in an issued code. */
    public static final int CODE_LENGTH = 6;

    /** Exclusive upper bound for the numeric draw ({@code 10^CODE_LENGTH}). */
    private static final int CODE_BOUND = 1_000_000;

    private final SecureRandom secureRandom = new SecureRandom();

    /**
     * @return a freshly generated 6-digit numeric code, zero-padded (e.g. {@code "004217"}).
     */
    public String generate() {
        int value = secureRandom.nextInt(CODE_BOUND);
        return String.format("%0" + CODE_LENGTH + "d", value);
    }
}
