package com.caygiapha.familytree.security;

import org.springframework.stereotype.Component;

/**
 * Request-scoped holder exposing the current {@link AuthContext} to controllers and services,
 * mirroring Spring's {@code RequestContextHolder} pattern (design "Request Flow Summary").
 *
 * <p>The {@link AuthenticationFilter} {@link #set(AuthContext) sets} the context at the start of
 * each request and {@link #clear() clears} it in a {@code finally} block, so the backing
 * {@link ThreadLocal} never leaks across pooled request threads. Any collaborator that needs the
 * caller's identity (notably {@link AuthorizationService}) reads it via {@link #current()}, which
 * returns {@link AuthContext#anonymous()} when no authenticated context is bound.
 *
 * <p>The holder is a Spring bean so it can be injected; the {@link ThreadLocal} itself is static so
 * the single bound value is shared correctly across the beans participating in one request thread.
 */
@Component
public class AuthContextHolder {

    private static final ThreadLocal<AuthContext> CONTEXT =
            ThreadLocal.withInitial(AuthContext::anonymous);

    /** Bind the resolved context for the current request thread. */
    public void set(AuthContext context) {
        CONTEXT.set(context == null ? AuthContext.anonymous() : context);
    }

    /** The context bound to the current request thread, or the anonymous context when none. */
    public AuthContext current() {
        return CONTEXT.get();
    }

    /** Remove the bound context, preventing leakage across pooled threads. */
    public void clear() {
        CONTEXT.remove();
    }
}
