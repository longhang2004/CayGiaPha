package com.caygiapha.familytree.security;

import static org.assertj.core.api.Assertions.assertThat;

import com.caygiapha.familytree.security.AuthorizationService.Role;
import org.junit.jupiter.api.Test;

class CapabilitySetTest {

    @Test
    void mapsEveryTreeRoleToTheFrontendCapabilityContract() {
        assertThat(CapabilitySet.forTreeRole(TreeAccessRole.OWNER))
                .isEqualTo(new CapabilitySet(true, true, true, true, true, true, true));
        assertThat(CapabilitySet.forTreeRole(TreeAccessRole.CONTRIBUTOR))
                .isEqualTo(new CapabilitySet(true, true, true, false, false, false, false));
        assertThat(CapabilitySet.forTreeRole(TreeAccessRole.LINKED))
                .isEqualTo(CapabilitySet.none());
        assertThat(CapabilitySet.forTreeRole(TreeAccessRole.READER))
                .isEqualTo(CapabilitySet.none());
        assertThat(CapabilitySet.forTreeRole(TreeAccessRole.NONE))
                .isEqualTo(CapabilitySet.none());
    }

    @Test
    void mapsPersonScopedLinkedRightsWithoutGrantingTreeAdministration() {
        assertThat(CapabilitySet.forPersonRole(Role.OWNER))
                .isEqualTo(new CapabilitySet(true, true, true, true, true, true, true));
        assertThat(CapabilitySet.forPersonRole(Role.CONTRIBUTOR))
                .isEqualTo(new CapabilitySet(true, true, true, false, false, false, false));
        assertThat(CapabilitySet.forPersonRole(Role.LINKED_CLAIMED_USER))
                .isEqualTo(new CapabilitySet(true, false, true, true, false, false, false));
        assertThat(CapabilitySet.forPersonRole(Role.NEITHER))
                .isEqualTo(CapabilitySet.none());
    }
}
