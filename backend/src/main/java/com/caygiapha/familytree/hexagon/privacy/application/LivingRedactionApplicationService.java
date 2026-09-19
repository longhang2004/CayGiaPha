package com.caygiapha.familytree.hexagon.privacy.application;

import com.caygiapha.familytree.dto.PersonResponse;
import com.caygiapha.familytree.entity.Person;
import com.caygiapha.familytree.hexagon.privacy.port.in.LivingRedactionUseCase;
import com.caygiapha.familytree.security.AuthContext;
import com.caygiapha.familytree.service.AuditService;
import com.caygiapha.familytree.service.LivingPersonPolicy;
import java.util.UUID;
import org.springframework.stereotype.Service;

@Service
public class LivingRedactionApplicationService implements LivingRedactionUseCase {

    public static final String SENSITIVE_READ = "privacy.sensitive_read";

    private final LivingPersonPolicy livingPersonPolicy;
    private final AuditService auditService;

    public LivingRedactionApplicationService(
            LivingPersonPolicy livingPersonPolicy, AuditService auditService) {
        this.livingPersonPolicy = livingPersonPolicy;
        this.auditService = auditService;
    }

    @Override
    public boolean isLiving(Person person) {
        return livingPersonPolicy.isLiving(person);
    }

    @Override
    public String visibleName(
            Person person, AuthContext viewer, UUID treeOwnerUserId, boolean livingRedactionEnabled) {
        if (!livingRedactionEnabled || !livingPersonPolicy.isLiving(person)) {
            return person.getDisplayName();
        }
        boolean privileged = viewer != null
                && viewer.userId() != null
                && (viewer.userId().equals(treeOwnerUserId));
        if (privileged) {
            auditService.record(SENSITIVE_READ, "person", person.getId(), "owner_read_living_name");
            return person.getDisplayName();
        }
        return PersonResponse.REDACTED_NAME_PLACEHOLDER;
    }
}
