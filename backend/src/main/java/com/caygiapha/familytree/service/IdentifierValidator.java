package com.caygiapha.familytree.service;

import com.caygiapha.familytree.error.ApiException;
import java.util.Optional;
import java.util.regex.Pattern;
import org.springframework.stereotype.Component;

/**
 * Validates and classifies the phone/email identifiers used for sign-up, sign-in, and node
 * claiming (Requirements 1.1, 1.2, 1.7).
 *
 * <p>This is a stateless, reusable utility with two complementary APIs:
 * <ul>
 *   <li>pure predicates ({@link #isValidPhone(String)}, {@link #isValidEmail(String)},
 *       {@link #isValid(String)}, {@link #classify(String)}) suitable for property-based testing
 *       and internal checks; and</li>
 *   <li>a throwing helper ({@link #requireValid(String, String)}) that rejects an invalid
 *       identifier with a field-naming {@link ApiException#validation(String, String)}, used by the
 *       orchestration endpoints (Tasks 6.5/6.7/6.8).</li>
 * </ul>
 *
 * <p><strong>Vietnamese phone format</strong> (Requirement 1.1): exactly 10 digits beginning with
 * {@code 0}, or a {@code +84} country prefix followed by exactly 9 digits.
 *
 * <p><strong>Email format</strong> (Requirements 1.2, 1.7): at most 254 characters, matching a
 * pragmatic {@code local-part@domain} pattern with a dotted domain.
 */
@Component
public class IdentifierValidator {

    /** Maximum permitted email length (Requirement 1.2). */
    public static final int MAX_EMAIL_LENGTH = 254;

    /** {@code 0} + 9 digits (10 total), or {@code +84} + 9 digits. */
    private static final Pattern PHONE_PATTERN = Pattern.compile("^(0\\d{9}|\\+84\\d{9})$");

    /**
     * Pragmatic {@code local-part@domain} matcher: a non-empty local part of permitted characters,
     * an {@code @}, then a dotted domain of letter/digit/hyphen labels (each label must start and
     * end alphanumerically). Overall length is bounded separately by {@link #MAX_EMAIL_LENGTH}.
     */
    private static final Pattern EMAIL_PATTERN = Pattern.compile(
            "^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+"
                    + "@[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?"
                    + "(?:\\.[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?)+$");

    /**
     * @return {@code true} iff {@code candidate} is a valid Vietnamese phone number (10 digits
     *     beginning with {@code 0}, or {@code +84} followed by 9 digits).
     */
    public boolean isValidPhone(String candidate) {
        return candidate != null && PHONE_PATTERN.matcher(candidate).matches();
    }

    /**
     * @return {@code true} iff {@code candidate} is a valid email of at most 254 characters in
     *     {@code local-part@domain} form.
     */
    public boolean isValidEmail(String candidate) {
        return candidate != null
                && candidate.length() <= MAX_EMAIL_LENGTH
                && EMAIL_PATTERN.matcher(candidate).matches();
    }

    /**
     * @return {@code true} iff {@code candidate} is a valid phone number or a valid email.
     */
    public boolean isValid(String candidate) {
        return isValidPhone(candidate) || isValidEmail(candidate);
    }

    /**
     * Classifies a candidate identifier without throwing.
     *
     * @return {@link IdentifierType#PHONE} or {@link IdentifierType#EMAIL} when valid; otherwise an
     *     empty {@link Optional}.
     */
    public Optional<IdentifierType> classify(String candidate) {
        if (isValidPhone(candidate)) {
            return Optional.of(IdentifierType.PHONE);
        }
        if (isValidEmail(candidate)) {
            return Optional.of(IdentifierType.EMAIL);
        }
        return Optional.empty();
    }

    /**
     * Validates an identifier, returning its type or rejecting the request with a field-level
     * {@link ApiException} that names the offending field (Requirement 1.7).
     *
     * @param field     the request field the identifier came from (e.g. {@code "identifier"})
     * @param candidate the submitted identifier
     * @return the classified {@link IdentifierType}
     * @throws ApiException {@code VALIDATION_ERROR} when the identifier is neither a valid VN phone
     *     nor a valid email
     */
    public IdentifierType requireValid(String field, String candidate) {
        return classify(candidate).orElseThrow(() -> ApiException.validation(
                field,
                "Identifier must be a valid Vietnamese phone number "
                        + "(10 digits beginning with 0, or +84 followed by 9 digits) "
                        + "or an email address of at most 254 characters."));
    }
}
