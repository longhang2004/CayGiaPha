package com.caygiapha.familytree.platform.resilience;

import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdTokenVerifier;
import io.github.resilience4j.circuitbreaker.annotation.CircuitBreaker;
import io.github.resilience4j.retry.annotation.Retry;
import java.io.IOException;
import java.security.GeneralSecurityException;
import org.springframework.stereotype.Component;

/**
 * Outbound Google Identity adapter with Resilience4j. AuthService keeps using the verifier
 * bean directly; this port is the hexagonal showcase and can replace the direct call later.
 */
@Component
public class ResilientGoogleIdentityClient {

    private final GoogleIdTokenVerifier verifier;

    public ResilientGoogleIdentityClient(GoogleIdTokenVerifier verifier) {
        this.verifier = verifier;
    }

    @CircuitBreaker(name = "outboundGoogle")
    @Retry(name = "outboundGoogle")
    public GoogleIdToken verify(String idToken) throws GeneralSecurityException, IOException {
        return verifier.verify(idToken);
    }
}
