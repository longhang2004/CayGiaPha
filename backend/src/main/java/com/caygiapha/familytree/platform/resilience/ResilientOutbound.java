package com.caygiapha.familytree.platform.resilience;

import io.github.resilience4j.circuitbreaker.CircuitBreaker;
import io.github.resilience4j.circuitbreaker.CircuitBreakerRegistry;
import io.github.resilience4j.retry.Retry;
import io.github.resilience4j.retry.RetryRegistry;
import java.util.function.Supplier;
import org.springframework.stereotype.Component;

/**
 * Programmatic Resilience4j decorator for outbound HTTP (email / Google). Failures stay
 * in metrics; no PII is logged here.
 */
@Component
public class ResilientOutbound {

    private final CircuitBreaker circuitBreaker;
    private final Retry retry;

    public ResilientOutbound(CircuitBreakerRegistry circuitBreakerRegistry, RetryRegistry retryRegistry) {
        this.circuitBreaker = circuitBreakerRegistry.circuitBreaker("outboundEmail");
        this.retry = retryRegistry.retry("outboundEmail");
    }

    public <T> T call(Supplier<T> action) {
        Supplier<T> decorated = CircuitBreaker.decorateSupplier(circuitBreaker, action);
        decorated = Retry.decorateSupplier(retry, decorated);
        return decorated.get();
    }
}
