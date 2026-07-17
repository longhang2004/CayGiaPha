package com.caygiapha.familytree.security;

import com.caygiapha.familytree.security.AuthorizationService.Role;

/** Server-authoritative action flags consumed by the tree workspace. */
public record CapabilitySet(
        boolean editContent,
        boolean editRelationships,
        boolean editPhotos,
        boolean editVisibility,
        boolean manageClaim,
        boolean manageTree,
        boolean manageCollaboration) {

    private static final CapabilitySet NONE =
            new CapabilitySet(false, false, false, false, false, false, false);

    public static CapabilitySet none() {
        return NONE;
    }

    public static CapabilitySet forTreeRole(TreeAccessRole role) {
        if (role == null) {
            return NONE;
        }
        return switch (role) {
            case OWNER -> new CapabilitySet(true, true, true, true, true, true, true);
            case CONTRIBUTOR ->
                    new CapabilitySet(true, true, true, false, false, false, false);
            case LINKED, READER, NONE -> NONE;
        };
    }

    public static CapabilitySet forPersonRole(Role role) {
        if (role == null) {
            return NONE;
        }
        return switch (role) {
            case OWNER -> new CapabilitySet(true, true, true, true, true, true, true);
            case CONTRIBUTOR ->
                    new CapabilitySet(true, true, true, false, false, false, false);
            case LINKED_CLAIMED_USER ->
                    new CapabilitySet(true, false, true, true, false, false, false);
            case NEITHER -> NONE;
        };
    }
}
