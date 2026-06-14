package com.caygiapha.familytree.service;

import com.caygiapha.familytree.repository.UserRepository;
import java.time.Duration;
import java.util.concurrent.Callable;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.ThreadFactory;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;
import java.util.concurrent.atomic.AtomicInteger;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

/**
 * Time-bounded duplicate-identifier check for sign-up (Requirements 1.6, 1.9).
 *
 * <p>Sign-up must reject an identifier that is already registered (1.6), but the determination is
 * given a bounded budget: if the check cannot conclude within {@value #BUDGET_SECONDS} seconds, the
 * caller proceeds to create the account as unverified rather than blocking the user (1.9).
 *
 * <p>The approach runs the {@code exists} query on a separate worker so the calling request thread
 * can enforce a hard wall-clock deadline via {@link Future#get(long, TimeUnit)}:
 * <ul>
 *   <li>completes with "exists" → {@link Result#TAKEN} (caller rejects, 1.6);</li>
 *   <li>completes with "does not exist" → {@link Result#AVAILABLE} (caller creates the account);</li>
 *   <li>does not complete within the budget, is interrupted, or fails → {@link Result#UNDETERMINED}
 *       (caller creates the account as unverified, the 1.9 fallback).</li>
 * </ul>
 *
 * <p>The budget is injectable so tests can drive the timeout path deterministically.
 */
@Component
public class DuplicateIdentifierChecker {

    /** The duplicate-check budget in seconds (Requirement 1.9). */
    public static final long BUDGET_SECONDS = 5;

    private static final Logger log = LoggerFactory.getLogger(DuplicateIdentifierChecker.class);

    /** Outcome of a time-bounded duplicate check. */
    public enum Result {
        /** The identifier is already registered; sign-up must be rejected (1.6). */
        TAKEN,
        /** The identifier is free; the account may be created (1.1, 1.2). */
        AVAILABLE,
        /** The check could not conclude within the budget; create the account unverified (1.9). */
        UNDETERMINED
    }

    private final UserRepository userRepository;
    private final Duration budget;
    private final ExecutorService executor;

    @Autowired
    public DuplicateIdentifierChecker(UserRepository userRepository) {
        this(userRepository, Duration.ofSeconds(BUDGET_SECONDS));
    }

    /** Package-private constructor allowing tests to supply a small budget. */
    DuplicateIdentifierChecker(UserRepository userRepository, Duration budget) {
        this.userRepository = userRepository;
        this.budget = budget;
        this.executor = Executors.newCachedThreadPool(daemonThreadFactory());
    }

    /**
     * Determine, within the configured budget, whether {@code identifier} of the given type is
     * already registered.
     *
     * @return {@link Result#TAKEN}, {@link Result#AVAILABLE}, or {@link Result#UNDETERMINED}
     */
    public Result check(IdentifierType type, String identifier) {
        Callable<Boolean> task = () -> exists(type, identifier);
        Future<Boolean> future = executor.submit(task);
        try {
            boolean exists = future.get(budget.toMillis(), TimeUnit.MILLISECONDS);
            return exists ? Result.TAKEN : Result.AVAILABLE;
        } catch (TimeoutException e) {
            future.cancel(true);
            log.warn("Duplicate-identifier check exceeded the {}ms budget; "
                    + "proceeding to create an unverified account (Requirement 1.9).",
                    budget.toMillis());
            return Result.UNDETERMINED;
        } catch (InterruptedException e) {
            future.cancel(true);
            Thread.currentThread().interrupt();
            return Result.UNDETERMINED;
        } catch (ExecutionException e) {
            log.warn("Duplicate-identifier check failed; "
                    + "proceeding to create an unverified account (Requirement 1.9).", e.getCause());
            return Result.UNDETERMINED;
        }
    }

    private boolean exists(IdentifierType type, String identifier) {
        return type == IdentifierType.PHONE
                ? userRepository.existsByPhone(identifier)
                : userRepository.existsByEmail(identifier);
    }

    private static ThreadFactory daemonThreadFactory() {
        AtomicInteger counter = new AtomicInteger();
        return runnable -> {
            Thread thread = new Thread(runnable, "dup-id-check-" + counter.incrementAndGet());
            thread.setDaemon(true);
            return thread;
        };
    }
}
