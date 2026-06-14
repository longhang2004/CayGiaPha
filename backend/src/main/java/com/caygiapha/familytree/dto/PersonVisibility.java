package com.caygiapha.familytree.dto;

import java.util.Set;

/**
 * The closed value domain for a sensitive field's visibility setting (Requirement 14.1): exactly
 * one of {@code "private"} or {@code "public"}.
 *
 * <p>Centralizes the literal values and the allowed-value set so the entity defaults, the
 * {@link PersonResponse} privacy filter, and the visibility-setter service all agree on the same
 * domain. New {@code Person} nodes default each sensitive field to {@link #PRIVATE} (Requirement
 * 14.2), enforced by the schema/entity defaults.
 */
public final class PersonVisibility {

    /** Hidden from non-owner / non-linked viewers (the default; 14.2, 14.4). */
    public static final String PRIVATE = "private";

    /** Visible to every authorized viewer of the tree (14.5). */
    public static final String PUBLIC = "public";

    /** The only two valid visibility settings (14.1). */
    public static final Set<String> VALUES = Set.of(PRIVATE, PUBLIC);

    private PersonVisibility() {
        // Constants holder.
    }

    /** Whether the given value is one of the two valid visibility settings (14.1). */
    public static boolean isValid(String value) {
        return value != null && VALUES.contains(value);
    }
}
