package com.caygiapha.familytree.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.caygiapha.familytree.entity.Relationship;
import com.caygiapha.familytree.repository.RelationshipRepository;
import com.caygiapha.familytree.service.CanonicalRelation.BranchOrder;
import com.caygiapha.familytree.service.CanonicalRelation.Gender;
import com.caygiapha.familytree.service.CanonicalRelation.Side;
import java.util.List;
import java.util.UUID;
import net.jqwik.api.Arbitraries;
import net.jqwik.api.Arbitrary;
import net.jqwik.api.Combinators;
import net.jqwik.api.ForAll;
import net.jqwik.api.Property;
import net.jqwik.api.Provide;

/**
 * Property-based tests for the asserted-relationship upgrade and conflict-detection scan
 * ({@link AssertedUpgradeService}, task 4.2; design: <em>Asserted vs Derived Relationships —
 * Upgrade and conflict-detection flow</em>).
 *
 * <p>Feature: vietnamese-family-tree, Property 17
 *
 * <p><strong>Property 17: Asserted-relationship upgrade and conflict detection</strong> — for any
 * asserted pair {@code (A, B)} that becomes joined by an unbroken bloodline path, the scan upgrades
 * the edge based on the newly derived {@code Form_Of_Address(A, B)}:
 *
 * <ul>
 *   <li>when the derived term <strong>equals</strong> the stored asserted label, the edge is marked
 *       {@code verified} and <strong>no</strong> warning is raised; (7.1, 7.4)</li>
 *   <li>when the derived term <strong>differs</strong>, the edge is marked {@code conflict}, the
 *       asserted label is <strong>retained unchanged</strong>, and a single {@link ConflictWarning}
 *       carrying <strong>both</strong> the asserted label and the derived term is produced. (7.1,
 *       7.5, 15.9)</li>
 * </ul>
 *
 * <p><strong>Independent oracle.</strong> Over a tree where {@code A} and {@code B} are genuinely
 * bloodline-connected and the resolver yields a defined derived term, the outcome is {@code
 * verified} <em>iff</em> {@code assertedLabel.equals(derivedTerm)}, otherwise {@code conflict}. The
 * scan is exercised directly through {@link AssertedUpgradeService#scanForUpgrades} with a
 * controllable derived-term resolution ({@link KinshipAddressService#resolveDerivedAddress} mocked)
 * so match and mismatch are forced deterministically, exactly as production wires the scan after a
 * bloodline edge completes.
 *
 * <p><strong>Validates: Requirements 7.1, 7.4, 7.5, 15.9</strong>
 */
class AssertedUpgradeConflictProperties {

    private static final UUID TREE_ID = new UUID(17L, 17L);
    private static final UUID A = new UUID(0L, 1L);
    private static final UUID B = new UUID(0L, 2L);
    private static final UUID COMMON_ANCESTOR = new UUID(0L, 3L);

    /** A small pool of valid Vietnamese kinship address terms (asserted-label length 1–50). */
    private static final List<String> TERMS =
            List.of("bác", "chú", "cô", "dì", "cậu", "anh", "chị", "em", "ông", "bà");

    /**
     * A generated scenario for a single completed asserted pair: the user-provided asserted label
     * and the term the completed bloodline path derives. {@code shouldMatch} records the intended
     * branch and is consistent with {@code assertedLabel.equals(derivedTerm)} by construction.
     */
    private record Scenario(String assertedLabel, String derivedTerm, boolean shouldMatch) {}

    @Provide
    Arbitrary<Scenario> scenarios() {
        Arbitrary<String> label = Arbitraries.of(TERMS);
        // Half the cases force a match (derived == asserted); the other half force a guaranteed
        // mismatch by drawing a different term, so both branches are exercised across ≥100 cases.
        Arbitrary<Boolean> matchFlag = Arbitraries.of(true, false);

        return Combinators.combine(label, matchFlag, Arbitraries.of(TERMS))
                .as((assertedLabel, match, other) -> {
                    if (match) {
                        return new Scenario(assertedLabel, assertedLabel, true);
                    }
                    // Ensure the "other" term genuinely differs from the asserted label.
                    String derived = other.equals(assertedLabel)
                            ? TERMS.get((TERMS.indexOf(assertedLabel) + 1) % TERMS.size())
                            : other;
                    return new Scenario(assertedLabel, derived, false);
                });
    }

    /** A still-asserted edge A -> B labelled {@code label}. */
    private static Relationship assertedEdge(String label) {
        Relationship edge = new Relationship(TREE_ID, RelationshipService.TYPE_ASSERTED, A, B);
        edge.setAssertedLabel(label);
        edge.setDerivationState("asserted");
        return edge;
    }

    private static Relationship fatherEdge(UUID parent, UUID child) {
        return new Relationship(TREE_ID, RelationshipService.TYPE_BLOODLINE_FATHER, parent, child);
    }

    /** A resolved derived address carrying {@code term}, as the resolver would return. */
    private static AddressResolution resolved(String term) {
        return AddressResolution.resolved(term, CanonicalResolution.resolved(
                new CanonicalRelation(1, 1, Side.PATERNAL, Gender.MALE, BranchOrder.ELDER, false)));
    }

    /**
     * Feature: vietnamese-family-tree, Property 17
     *
     * <p>For a bloodline-connected asserted pair with a defined derived term, the scan verifies with
     * no warning when the derived term equals the asserted label, and otherwise flags a conflict
     * that retains the asserted label and warns with both the asserted label and the derived term.
     *
     * <p>Validates: Requirements 7.1, 7.4, 7.5, 15.9
     */
    @Property(tries = 200)
    void completedAssertedPairUpgradesOrConflictsAgainstDerivedTerm(
            @ForAll("scenarios") Scenario scenario) {
        RelationshipRepository relationshipRepository = mock(RelationshipRepository.class);
        KinshipAddressService addressService = mock(KinshipAddressService.class);
        AssertedUpgradeService service =
                new AssertedUpgradeService(relationshipRepository, addressService);

        Relationship asserted = assertedEdge(scenario.assertedLabel());

        when(relationshipRepository.findByTreeIdAndType(
                        TREE_ID, RelationshipService.TYPE_ASSERTED))
                .thenReturn(List.of(asserted));
        // An unbroken bloodline chain joins A and B through a shared father (the path is complete).
        when(relationshipRepository.findByTreeIdAndType(
                        TREE_ID, RelationshipService.TYPE_BLOODLINE_FATHER))
                .thenReturn(List.of(fatherEdge(COMMON_ANCESTOR, A), fatherEdge(COMMON_ANCESTOR, B)));
        when(relationshipRepository.findByTreeIdAndType(
                        TREE_ID, RelationshipService.TYPE_BLOODLINE_MOTHER))
                .thenReturn(List.of());
        lenient().when(relationshipRepository.save(any(Relationship.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));
        when(addressService.resolveDerivedAddress(TREE_ID, A, B))
                .thenReturn(resolved(scenario.derivedTerm()));

        List<ConflictWarning> warnings = service.scanForUpgrades(TREE_ID);

        // Independent oracle: verified iff the asserted label equals the derived term.
        boolean expectVerified = scenario.assertedLabel().equals(scenario.derivedTerm());
        assertThat(expectVerified).isEqualTo(scenario.shouldMatch());

        if (expectVerified) {
            // (7.1, 7.4) Verified state, label unchanged, and NO warning on a match.
            assertThat(asserted.getDerivationState()).isEqualTo("verified");
            assertThat(asserted.getAssertedLabel()).isEqualTo(scenario.assertedLabel());
            assertThat(warnings).isEmpty();
        } else {
            // (7.1, 7.5) Conflict state with the asserted label retained unchanged.
            assertThat(asserted.getDerivationState()).isEqualTo("conflict");
            assertThat(asserted.getAssertedLabel()).isEqualTo(scenario.assertedLabel());

            // (7.5, 15.9) Exactly one warning carrying BOTH values for the affected pair.
            assertThat(warnings).hasSize(1);
            ConflictWarning warning = warnings.get(0);
            assertThat(warning.sourceId()).isEqualTo(A);
            assertThat(warning.targetId()).isEqualTo(B);
            assertThat(warning.assertedLabel()).isEqualTo(scenario.assertedLabel());
            assertThat(warning.derivedTerm()).isEqualTo(scenario.derivedTerm());
            // The retained label and the conflicting derived term are genuinely distinct.
            assertThat(warning.assertedLabel()).isNotEqualTo(warning.derivedTerm());
        }
    }
}
