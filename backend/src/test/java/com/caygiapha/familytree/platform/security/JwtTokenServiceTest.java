package com.caygiapha.familytree.platform.security;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class JwtTokenServiceTest {

    @Test
    void issuesAndVerifiesUserIdWithoutFamilyPayload() {
        JwtProperties properties = new JwtProperties();
        properties.setSecret("unit-test-secret-must-be-32-bytes!");
        properties.setIssuer("caygiapha-family-tree-api");
        Clock clock = Clock.fixed(Instant.parse("2026-09-19T00:00:00Z"), ZoneOffset.UTC);
        JwtTokenService service = new JwtTokenService(properties, clock);
        UUID userId = UUID.fromString("11111111-1111-1111-1111-111111111111");

        String token = service.issue(userId);

        assertThat(token.split("\\.")).hasSize(3);
        assertThat(token).doesNotContain("Nguyen");
        assertThat(service.verify(token)).contains(userId);
        assertThat(service.parseUserId(token)).contains(userId);
    }

    @Test
    void rejectsTamperedToken() {
        JwtProperties properties = new JwtProperties();
        properties.setSecret("unit-test-secret-must-be-32-bytes!");
        JwtTokenService service = new JwtTokenService(properties, Clock.systemUTC());
        String token = service.issue(UUID.randomUUID());

        assertThat(service.verify(token + "x")).isEmpty();
        assertThat(service.verify("not-a-jwt")).isEmpty();
    }
}
