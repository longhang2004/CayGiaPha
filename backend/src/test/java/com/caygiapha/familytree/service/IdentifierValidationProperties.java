package com.caygiapha.familytree.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.caygiapha.familytree.dto.SignUpResponse;
import com.caygiapha.familytree.entity.Tree;
import com.caygiapha.familytree.entity.User;
import com.caygiapha.familytree.error.ApiException;
import com.caygiapha.familytree.error.ErrorCode;
import com.caygiapha.familytree.repository.TreeRepository;
import com.caygiapha.familytree.repository.UserRepository;
import java.util.UUID;
import net.jqwik.api.Arbitraries;
import net.jqwik.api.Arbitrary;
import net.jqwik.api.Combinators;
import net.jqwik.api.ForAll;
import net.jqwik.api.Property;
import net.jqwik.api.Provide;
import org.mockito.invocation.InvocationOnMock;

/**
 * Property-based test for design <strong>Property 3: Identifier validation</strong>.
 *
 * <p>Feature: vietnamese-family-tree, Property 3
 *
 * <p>For any string submitted as an identifier, sign-up is accepted <em>if and only if</em> the
 * string is a valid Vietnamese phone number (10 digits beginning with {@code 0}, or {@code +84}
 * followed by 9 digits) or a valid email (≤254 chars, {@code local-part@domain}); invalid
 * identifiers are rejected with the offending field named and no account created.
 *
 * <p>The test checks the property at two levels:
 * <ol>
 *   <li>the pure {@link IdentifierValidator} predicate — {@code isValid} agrees with an independent
 *       oracle for every generated string; and</li>
 *   <li>{@link AuthService#signUp} — an invalid identifier is rejected with a {@code
 *       VALIDATION_ERROR} naming the {@code identifier} field and {@link UserRepository#save} is
 *       never called; a valid identifier results in exactly one account being saved.</li>
 * </ol>
 *
 * <p>The validity oracle ({@link #oracleIsValid(String)}) is implemented independently of the
 * production regexes (by string decomposition) and follows the documented rules verbatim.
 *
 * <p><strong>Validates: Requirements 1.1, 1.2, 1.7</strong>
 */
class IdentifierValidationProperties {

    private static final int MAX_EMAIL_LENGTH = 254;

    /** Characters permitted in an email local part per the documented {@code local-part} grammar. */
    private static final String LOCAL_SPECIALS = ".!#$%&'*+/=?^_`{|}~-";

    // ---------------------------------------------------------------------------------------------
    // Property 3 — Pure validator: accepted iff valid VN phone or valid email.
    // ---------------------------------------------------------------------------------------------

    /**
     * Feature: vietnamese-family-tree, Property 3.
     *
     * <p>{@link IdentifierValidator#isValid} (and {@link IdentifierValidator#classify}) must agree
     * with the independent oracle for every generated identifier: valid phone, valid email,
     * oversized/malformed email, or random junk.
     */
    @Property(tries = 300)
    void validatorAcceptsIffValidVnPhoneOrEmail(@ForAll("identifiers") String candidate) {
        IdentifierValidator validator = new IdentifierValidator();

        boolean expected = oracleIsValid(candidate);
        assertThat(validator.isValid(candidate))
                .as("isValid(%s) should match the independent oracle", candidate)
                .isEqualTo(expected);

        // classify() is consistent with isValid(): present iff valid, and the type matches.
        assertThat(validator.classify(candidate).isPresent()).isEqualTo(expected);
        if (expected) {
            IdentifierType type = validator.classify(candidate).orElseThrow();
            IdentifierType expectedType =
                    oracleIsValidPhone(candidate) ? IdentifierType.PHONE : IdentifierType.EMAIL;
            assertThat(type).isEqualTo(expectedType);
        }
    }

    // ---------------------------------------------------------------------------------------------
    // Property 3 — AuthService.signUp: accepted iff valid; reject names the field, creates no account.
    // ---------------------------------------------------------------------------------------------

    /**
     * Feature: vietnamese-family-tree, Property 3.
     *
     * <p>Drives {@link AuthService#signUp} with each generated identifier. A valid identifier
     * results in exactly one persisted {@link User}; an invalid identifier is rejected with a
     * {@code VALIDATION_ERROR} naming the {@code identifier} field and {@code UserRepository.save}
     * is never invoked (no account created).
     */
    @Property(tries = 300)
    void signUpAcceptedIffValidAndRejectionNamesFieldAndCreatesNoAccount(
            @ForAll("identifiers") String candidate) {
        // Fresh mocks per try so no state leaks between generated cases.
        UserRepository userRepository = mock(UserRepository.class);
        TreeRepository treeRepository = mock(TreeRepository.class);
        DuplicateIdentifierChecker duplicateChecker = mock(DuplicateIdentifierChecker.class);
        VerificationCodeService verificationCodeService = mock(VerificationCodeService.class);

        // The identifier is free, so validity is the only deciding factor for acceptance.
        when(duplicateChecker.check(any(), any()))
                .thenReturn(DuplicateIdentifierChecker.Result.AVAILABLE);
        when(userRepository.save(any(User.class))).thenAnswer((InvocationOnMock i) -> {
            User u = i.getArgument(0);
            setId(u, UUID.randomUUID());
            return u;
        });
        when(treeRepository.save(any(Tree.class))).thenAnswer((InvocationOnMock i) -> i.getArgument(0));

        AuthService service = new AuthService(
                userRepository,
                treeRepository,
                new IdentifierValidator(),
                duplicateChecker,
                verificationCodeService,
                mock(SessionService.class),
                null,
                null
        );

        boolean expectedValid = oracleIsValid(candidate);

        if (expectedValid) {
            SignUpResponse response = service.signUp(candidate);
            assertThat(response.userId()).isNotNull();
            assertThat(response.verified()).isFalse();
            // Exactly one account created for a valid identifier.
            verify(userRepository).save(any(User.class));
        } else {
            assertThatThrownBy(() -> service.signUp(candidate))
                    .isInstanceOfSatisfying(ApiException.class, ex -> {
                        assertThat(ex.code()).isEqualTo(ErrorCode.VALIDATION_ERROR); // 1.7
                        assertThat(ex.field()).isEqualTo("identifier"); // offending field named
                    });
            // No account created when the identifier is invalid.
            verify(userRepository, never()).save(any());
            verify(verificationCodeService, never()).issueForAccount(any(), any(), any());
        }
    }

    // ---------------------------------------------------------------------------------------------
    // Independent validity oracle (string decomposition, no production regex reuse).
    // ---------------------------------------------------------------------------------------------

    /** @return {@code true} iff the candidate is a valid VN phone or a valid email per the rules. */
    private static boolean oracleIsValid(String candidate) {
        return oracleIsValidPhone(candidate) || oracleIsValidEmail(candidate);
    }

    /** 10 digits beginning with {@code 0}, OR {@code +84} followed by exactly 9 digits. */
    private static boolean oracleIsValidPhone(String s) {
        if (s == null) {
            return false;
        }
        if (s.length() == 10 && s.charAt(0) == '0' && allDigits(s, 0)) {
            return true;
        }
        return s.length() == 12 && s.startsWith("+84") && allDigits(s, 3);
    }

    /** ≤254 chars and a single {@code local@domain} with a non-empty local and a dotted domain. */
    private static boolean oracleIsValidEmail(String s) {
        if (s == null || s.isEmpty() || s.length() > MAX_EMAIL_LENGTH) {
            return false;
        }
        String[] parts = s.split("@", -1);
        if (parts.length != 2) { // exactly one '@'
            return false;
        }
        return validLocalPart(parts[0]) && validDomain(parts[1]);
    }

    private static boolean validLocalPart(String local) {
        if (local.isEmpty()) {
            return false;
        }
        for (int i = 0; i < local.length(); i++) {
            char c = local.charAt(i);
            if (!isAsciiAlnum(c) && LOCAL_SPECIALS.indexOf(c) < 0) {
                return false;
            }
        }
        return true;
    }

    private static boolean validDomain(String domain) {
        String[] labels = domain.split("\\.", -1);
        if (labels.length < 2) { // at least one dot → at least two labels
            return false;
        }
        for (String label : labels) {
            if (!validDomainLabel(label)) {
                return false;
            }
        }
        return true;
    }

    private static boolean validDomainLabel(String label) {
        if (label.isEmpty()) {
            return false;
        }
        if (!isAsciiAlnum(label.charAt(0)) || !isAsciiAlnum(label.charAt(label.length() - 1))) {
            return false; // must start and end alphanumerically
        }
        for (int i = 1; i < label.length() - 1; i++) {
            char c = label.charAt(i);
            if (!isAsciiAlnum(c) && c != '-') {
                return false; // interior chars: alphanumeric or hyphen
            }
        }
        return true;
    }

    private static boolean allDigits(String s, int from) {
        for (int i = from; i < s.length(); i++) {
            if (s.charAt(i) < '0' || s.charAt(i) > '9') {
                return false;
            }
        }
        return true;
    }

    private static boolean isAsciiAlnum(char c) {
        return (c >= 'A' && c <= 'Z') || (c >= 'a' && c <= 'z') || (c >= '0' && c <= '9');
    }

    // ---------------------------------------------------------------------------------------------
    // Generators: a mix of valid phones, valid emails, oversized/malformed emails, and random junk.
    // ---------------------------------------------------------------------------------------------

    @Provide
    Arbitrary<String> identifiers() {
        return Arbitraries.oneOf(
                validPhones(),
                validEmails(),
                oversizedEmails(),
                malformedEmails(),
                randomJunk());
    }

    /** {@code 0} + 9 digits, or {@code +84} + 9 digits. */
    @Provide
    Arbitrary<String> validPhones() {
        Arbitrary<String> nineDigits =
                Arbitraries.strings().withCharRange('0', '9').ofLength(9);
        Arbitrary<String> local = nineDigits.map(d -> "0" + d);
        Arbitrary<String> intl = nineDigits.map(d -> "+84" + d);
        return Arbitraries.oneOf(local, intl);
    }

    /** Well-formed {@code local@domain} emails comfortably within the length bound. */
    @Provide
    Arbitrary<String> validEmails() {
        Arbitrary<String> localChars =
                Arbitraries.strings().withCharRange('a', 'z').numeric().ofMinLength(1).ofMaxLength(12);
        Arbitrary<String> label =
                Arbitraries.strings().withCharRange('a', 'z').numeric().ofMinLength(1).ofMaxLength(8);
        Arbitrary<String> tld =
                Arbitraries.strings().withCharRange('a', 'z').ofMinLength(2).ofMaxLength(4);
        return Combinators.combine(localChars, label, tld)
                .as((l, d, t) -> l + "@" + d + "." + t);
    }

    /** Structurally valid emails whose total length exceeds the 254-char bound (invalid). */
    @Provide
    Arbitrary<String> oversizedEmails() {
        return Arbitraries.integers().between(255, 320).map(len -> {
            int localLen = len - "@example.com".length();
            return "a".repeat(Math.max(1, localLen)) + "@example.com";
        });
    }

    /** Emails missing the {@code @}, missing a dotted domain, or with empty parts (invalid). */
    @Provide
    Arbitrary<String> malformedEmails() {
        return Arbitraries.of(
                "plainaddress",
                "@example.com",
                "user@",
                "user@@example.com",
                "user@domain",
                "user@.com",
                "user@com.",
                "user name@example.com",
                "us er@exam ple.com",
                "@",
                "a@b@c.com",
                "user@-bad.com",
                "user@bad-.com");
    }

    /** Arbitrary strings over a broad character range, plus a few degenerate cases. */
    @Provide
    Arbitrary<String> randomJunk() {
        Arbitrary<String> random =
                Arbitraries.strings().withCharRange('\u0020', '\u007E').ofMinLength(0).ofMaxLength(40);
        Arbitrary<String> degenerate = Arbitraries.of(
                "",
                "   ",
                "0123456789",      // 10 digits but does not begin with 0? begins with 0 -> valid; covers boundary
                "1234567890",      // 10 digits not beginning with 0 (invalid phone)
                "012345678",       // 9 digits (too short)
                "01234567890",     // 11 digits (too long)
                "+8412345678",     // +84 + 8 digits (too short)
                "+841234567890",   // +84 + 10 digits (too long)
                "84123456789");    // missing '+'
        return Arbitraries.oneOf(random, degenerate);
    }

    /** Assign a JPA-managed id via reflection for mocked persistence. */
    private static void setId(Object entity, UUID id) {
        try {
            var field = entity.getClass().getDeclaredField("id");
            field.setAccessible(true);
            field.set(entity, id);
        } catch (ReflectiveOperationException e) {
            throw new IllegalStateException(e);
        }
    }
}
