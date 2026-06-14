package com.caygiapha.familytree.service;

/**
 * The lineage side of a bloodline link, used by the {@code Kinship_Resolver} to select
 * paternal-side terms (bác/chú) versus the maternal-side term (cậu). (Requirements 8.2, 8.3)
 *
 * <p>A father link contributes the {@link #PATERNAL} side; a mother link contributes the
 * {@link #MATERNAL} side.
 */
public enum Side {
    PATERNAL,
    MATERNAL
}
