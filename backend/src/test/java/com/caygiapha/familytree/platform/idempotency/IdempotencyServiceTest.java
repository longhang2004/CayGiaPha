package com.caygiapha.familytree.platform.idempotency;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.caygiapha.familytree.error.ApiException;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class IdempotencyServiceTest {

    @Test
    void rejectsReusedKeyWithDifferentBody() {
        IdempotencyRecordRepository repository = mock(IdempotencyRecordRepository.class);
        Clock clock = Clock.fixed(Instant.parse("2026-09-19T00:00:00Z"), ZoneOffset.UTC);
        IdempotencyService service = new IdempotencyService(repository, clock);
        UUID userId = UUID.randomUUID();
        IdempotencyRecord stored = new IdempotencyRecord(
                "key-1",
                userId,
                "hash-a",
                201,
                "{}",
                Instant.parse("2026-09-20T00:00:00Z"));
        when(repository.findById("key-1")).thenReturn(Optional.of(stored));

        assertThatThrownBy(() -> service.replay("key-1", userId, "hash-b"))
                .isInstanceOf(ApiException.class)
                .hasMessageContaining("different body");
    }
}
