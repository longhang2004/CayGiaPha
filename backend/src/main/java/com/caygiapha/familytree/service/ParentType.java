package com.caygiapha.familytree.service;

/**
 * Which parent role a {@code Primitive_Bloodline_Edge} represents. A bloodline edge is directed
 * parent -> child; its type discriminator ({@code bloodline_father} / {@code bloodline_mother})
 * maps onto one of these roles, which in turn carries the lineage {@link Side}
 * (father -> paternal, mother -> maternal) used during address derivation. (Requirements 8.2, 8.3)
 */
public enum ParentType {
    FATHER(Side.PATERNAL),
    MOTHER(Side.MATERNAL);

    private final Side side;

    ParentType(Side side) {
        this.side = side;
    }

    /** The lineage side this parent role contributes (paternal for father, maternal for mother). */
    public Side side() {
        return side;
    }
}
