package com.caygiapha.familytree.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.caygiapha.familytree.repository.UserRepository;
import java.time.Duration;
import org.junit.jupiter.api.Test;
import org.mockito.invocation.InvocationOnMock;

/**
 * Unit tests for {@link DuplicateIdentifierChecker}: the TAKEN / AVAILABLE outcomes and the
 * time-bounded UNDETERMINED fallback when the check cannot conclude within its budget
 * (Requirements 1.6, 1.9).
 */
class DuplicateIdentifierCheckerTest {

    private static final String PHONE = "0912345678";
    private static final String EMAIL = "user@example.com";

    @Test
    void returnsTakenWhenIdentifierAlreadyExists() {
        UserRepository repo = mock(UserRepository.class);
        when(repo.existsByPhone(PHONE)).thenReturn(true);
        DuplicateIdentifierChecker checker =
                new DuplicateIdentifierChecker(repo, Duration.ofSeconds(5));

        assertThat(checker.check(IdentifierType.PHONE, PHONE))
                .isEqualTo(DuplicateIdentifierChecker.Result.TAKEN);
    }

    @Test
    void returnsAvailableWhenIdentifierIsFree() {
        UserRepository repo = mock(UserRepository.class);
        when(repo.existsByEmail(EMAIL)).thenReturn(false);
        DuplicateIdentifierChecker checker =
                new DuplicateIdentifierChecker(repo, Duration.ofSeconds(5));

        assertThat(checker.check(IdentifierType.EMAIL, EMAIL))
                .isEqualTo(DuplicateIdentifierChecker.Result.AVAILABLE);
    }

    @Test
    void returnsUndeterminedWhenCheckExceedsBudget() {
        UserRepository repo = mock(UserRepository.class);
        // Simulate a slow query that overruns the (tiny) test budget.
        when(repo.existsByPhone(PHONE)).thenAnswer((InvocationOnMock i) -> {
            Thread.sleep(500);
            return true;
        });
        DuplicateIdentifierChecker checker =
                new DuplicateIdentifierChecker(repo, Duration.ofMillis(50));

        assertThat(checker.check(IdentifierType.PHONE, PHONE))
                .isEqualTo(DuplicateIdentifierChecker.Result.UNDETERMINED); // 1.9
    }

    @Test
    void returnsUndeterminedWhenCheckThrows() {
        UserRepository repo = mock(UserRepository.class);
        when(repo.existsByPhone(PHONE)).thenThrow(new RuntimeException("db down"));
        DuplicateIdentifierChecker checker =
                new DuplicateIdentifierChecker(repo, Duration.ofSeconds(5));

        assertThat(checker.check(IdentifierType.PHONE, PHONE))
                .isEqualTo(DuplicateIdentifierChecker.Result.UNDETERMINED); // 1.9
    }
}
