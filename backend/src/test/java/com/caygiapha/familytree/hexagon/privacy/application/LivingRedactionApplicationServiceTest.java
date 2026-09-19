package com.caygiapha.familytree.hexagon.privacy.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;

import com.caygiapha.familytree.dto.PersonResponse;
import com.caygiapha.familytree.entity.Person;
import com.caygiapha.familytree.security.AuthContext;
import com.caygiapha.familytree.service.AuditService;
import com.caygiapha.familytree.service.LivingPersonPolicy;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class LivingRedactionApplicationServiceTest {

    private final Clock clock = Clock.fixed(Instant.parse("2026-09-19T00:00:00Z"), ZoneOffset.UTC);
    private final LivingPersonPolicy policy = new LivingPersonPolicy(clock);
    private final AuditService auditService = mock(AuditService.class);
    private final LivingRedactionApplicationService service =
            new LivingRedactionApplicationService(policy, auditService);

    @Test
    void redactsLivingNameForUnauthenticatedViewer() {
        Person person = new Person(UUID.randomUUID(), "Nguyễn Thị Lan", "female");
        person.setBirthYear(1996);

        String visible = service.visibleName(person, AuthContext.anonymous(), UUID.randomUUID(), true);

        assertThat(visible).isEqualTo(PersonResponse.REDACTED_NAME_PLACEHOLDER);
        verifyNoInteractions(auditService);
    }

    @Test
    void ownerSeesLivingNameAndAuditRecordsActionWithoutTheName() {
        UUID ownerId = UUID.randomUUID();
        Person person = new Person(UUID.randomUUID(), "Nguyễn Thị Lan", "female");
        person.setBirthYear(1996);
        AuthContext owner = AuthContext.authenticated(ownerId, UUID.randomUUID());

        String visible = service.visibleName(person, owner, ownerId, true);

        assertThat(visible).isEqualTo("Nguyễn Thị Lan");
        verify(auditService).record(
                LivingRedactionApplicationService.SENSITIVE_READ, "person", person.getId(), "owner_read_living_name");
    }
}
