package com.caygiapha.familytree.platform.security;

import com.nimbusds.jose.JOSEException;
import com.nimbusds.jose.JWSAlgorithm;
import com.nimbusds.jose.JWSHeader;
import com.nimbusds.jose.JWSSigner;
import com.nimbusds.jose.JWSVerifier;
import com.nimbusds.jose.crypto.MACSigner;
import com.nimbusds.jose.crypto.MACVerifier;
import com.nimbusds.jwt.JWTClaimsSet;
import com.nimbusds.jwt.SignedJWT;
import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.time.Instant;
import java.util.Date;
import java.util.Optional;
import java.util.UUID;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.stereotype.Service;

/**
 * HMAC JWT for API clients. Product browsers still use the HttpOnly SESSION cookie.
 * Subject is the user id only; no family payload is embedded.
 */
@Service
@EnableConfigurationProperties(JwtProperties.class)
public class JwtTokenService {

    private final JwtProperties properties;
    private final Clock clock;
    private final byte[] secret;

    public JwtTokenService(JwtProperties properties, Clock clock) {
        this.properties = properties;
        this.clock = clock;
        this.secret = normalizeSecret(properties.getSecret());
    }

    public String issue(UUID userId) {
        Instant now = Instant.now(clock);
        JWTClaimsSet claims = new JWTClaimsSet.Builder()
                .issuer(properties.getIssuer())
                .subject(userId.toString())
                .issueTime(Date.from(now))
                .expirationTime(Date.from(now.plusSeconds(properties.getTtlSeconds())))
                .jwtID(UUID.randomUUID().toString())
                .build();
        try {
            SignedJWT jwt = new SignedJWT(new JWSHeader(JWSAlgorithm.HS256), claims);
            JWSSigner signer = new MACSigner(secret);
            jwt.sign(signer);
            return jwt.serialize();
        } catch (JOSEException ex) {
            throw new IllegalStateException("Unable to sign JWT", ex);
        }
    }

    public Optional<UUID> parseUserId(String token) {
        return verify(token);
    }

    public Optional<UUID> verify(String token) {
        if (token == null || token.isBlank()) {
            return Optional.empty();
        }
        try {
            SignedJWT jwt = SignedJWT.parse(token);
            JWSVerifier verifier = new MACVerifier(secret);
            if (!jwt.verify(verifier)) {
                return Optional.empty();
            }
            JWTClaimsSet claims = jwt.getJWTClaimsSet();
            if (claims.getExpirationTime() == null
                    || claims.getExpirationTime().toInstant().isBefore(Instant.now(clock))) {
                return Optional.empty();
            }
            if (properties.getIssuer() != null
                    && !properties.getIssuer().equals(claims.getIssuer())) {
                return Optional.empty();
            }
            return Optional.of(UUID.fromString(claims.getSubject()));
        } catch (Exception ex) {
            return Optional.empty();
        }
    }

    private static byte[] normalizeSecret(String secret) {
        byte[] raw = secret.getBytes(StandardCharsets.UTF_8);
        if (raw.length >= 32) {
            return raw;
        }
        byte[] padded = new byte[32];
        System.arraycopy(raw, 0, padded, 0, raw.length);
        return padded;
    }
}
