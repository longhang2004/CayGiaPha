package com.caygiapha.familytree.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.caygiapha.familytree.entity.Relationship;
import com.caygiapha.familytree.repository.RelationshipRepository;
import com.caygiapha.familytree.service.CanonicalRelation.BranchOrder;
import com.caygiapha.familytree.service.CanonicalRelation.Gender;
import com.caygiapha.familytree.service.CanonicalRelation.Side;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

/**
 * Unit tests for the asserted-upgrade and conflict-detection scan
 * ({@link AssertedUpgradeService}, task 4.2; design: <em>Asserted vs Derived Relationships —
 * Upgrade and conflict-detection flow</em>).
 *
 * <p>Covers the three branches of the flowchart for an asserted pair {@code (A, B)}:
 *
 * <ul>
 *   <li>completed by an unbroken bloodline path with a <strong>matching</strong> derived term →
 *       {@code verified}, no warning; (7.1, 7.4)</li>
 *   <li>completed with a <strong>mismatching</strong> derived term → {@code conflict}, asserted
 *       label retained, warning carrying both the asserted label and the derived term; (7.1, 7.5)
 *       </li>
 *   <li><strong>not yet connected</strong> by bloodline → left unchanged, no warning. (7.1)</li>
 * </ul>
 */
class AssertedUpgradeServiceTest {

    private static final UUID TREE_ID = UUID.randomUUID();
    private static final UUID A = UUID.randomUUID();
    private static final UUID B = UUID.randomUUID();
    private static final UUID COMMON_ANCESTOR = UUID.randomUUID();

    private RelationshipRepository relationshipRepository;
    private KinshipAddressService addressService;
    private AssertedUpgradeService service;

    @BeforeEach
    void setUp() {
        relationshipRepository = mock(RelationshipRepository.class);
        addressService = mock(KinshipAddressService.class);
        service = new AssertedUpgradeService(relationshipRepository, addressService);
    }

    /** A still-asserted edge A -> B labelled {@code label}. */
    private Relationship assertedEdge(String label) {
        Relationship edge = new Relationship(
                TREE_ID, RelationshipService.TYPE_ASSERTED, A, B);
        edge.setAssertedLabel(label);
        edge.setDerivationState("asserted");
        return edge;
    }

    private Relationship fatherEdge(UUID parent, UUID child) {
        return new Relationship(TREE_ID, RelationshipService.TYPE_BLOODLINE_FATHER, parent, child);
    }

    /** Make A and B joined by an unbroken bloodline chain (common ancestor of both). */
    private void wireBloodlinePathBetweenAandB() {
        when(relationshipRepository.findByTreeIdAndType(
                TREE_ID, RelationshipService.TYPE_BLOODLINE_FATHER))
                .thenReturn(List.of(fatherEdge(COMMON_ANCESTOR, A), fatherEdge(COMMON_ANCESTOR, B)));
        when(relationshipRepository.findByTreeIdAndType(
                TREE_ID, RelationshipService.TYPE_BLOODLINE_MOTHER))
                .thenReturn(List.of());
    }

    private AddressResolution resolved(String term) {
        return AddressResolution.resolved(term, CanonicalResolution.resolved(
                new CanonicalRelation(1, 1, Side.PATERNAL, Gender.MALE, BranchOrder.ELDER, false)));
    }

    @Test
    void completedPairWithMatchingTermIsVerifiedWithoutWarning() {
        Relationship asserted = assertedEdge("bác");
        when(relationshipRepository.findByTreeIdAndType(
                TREE_ID, RelationshipService.TYPE_ASSERTED))
                .thenReturn(List.of(asserted));
        wireBloodlinePathBetweenAandB();
        // Derived term equals the stored asserted label. (7.4)
        when(addressService.resolveDerivedAddress(TREE_ID, A, B)).thenReturn(resolved("bác"));

        List<ConflictWarning> warnings = service.scanForUpgrades(TREE_ID);

        // (7.4) Verified, no conflict warning.
        assertThat(warnings).isEmpty();
        assertThat(asserted.getDerivationState()).isEqualTo("verified");
        // Label is unchanged by a verify.
        assertThat(asserted.getAssertedLabel()).isEqualTo("bác");
        verify(relationshipRepository).save(asserted);
    }

    @Test
    void completedPairWithMismatchingTermIsConflictWithRetainedLabelAndBothValues() {
        Relationship asserted = assertedEdge("bác");
        when(relationshipRepository.findByTreeIdAndType(
                TREE_ID, RelationshipService.TYPE_ASSERTED))
                .thenReturn(List.of(asserted));
        wireBloodlinePathBetweenAandB();
        // Derived term differs from the stored asserted label. (7.5)
        when(addressService.resolveDerivedAddress(TREE_ID, A, B)).thenReturn(resolved("chú"));

        List<ConflictWarning> warnings = service.scanForUpgrades(TREE_ID);

        // (7.5) Conflict state; the asserted label is retained unchanged.
        assertThat(asserted.getDerivationState()).isEqualTo("conflict");
        assertThat(asserted.getAssertedLabel()).isEqualTo("bác");
        verify(relationshipRepository).save(asserted);

        // (7.5) A single warning carrying BOTH the asserted label and the derived term.
        assertThat(warnings).hasSize(1);
        ConflictWarning warning = warnings.get(0);
        assertThat(warning.sourceId()).isEqualTo(A);
        assertThat(warning.targetId()).isEqualTo(B);
        assertThat(warning.assertedLabel()).isEqualTo("bác");
        assertThat(warning.derivedTerm()).isEqualTo("chú");
    }

    @Test
    void assertedPairNotYetConnectedByBloodlineIsLeftUnchanged() {
        Relationship asserted = assertedEdge("bác");
        when(relationshipRepository.findByTreeIdAndType(
                TREE_ID, RelationshipService.TYPE_ASSERTED))
                .thenReturn(List.of(asserted));
        // No bloodline edges joining A and B yet. (7.1 not triggered)
        when(relationshipRepository.findByTreeIdAndType(
                TREE_ID, RelationshipService.TYPE_BLOODLINE_FATHER))
                .thenReturn(List.of(fatherEdge(COMMON_ANCESTOR, A)));
        when(relationshipRepository.findByTreeIdAndType(
                TREE_ID, RelationshipService.TYPE_BLOODLINE_MOTHER))
                .thenReturn(List.of());

        List<ConflictWarning> warnings = service.scanForUpgrades(TREE_ID);

        // Unchanged: still asserted, no warning, no save, no derivation attempted.
        assertThat(warnings).isEmpty();
        assertThat(asserted.getDerivationState()).isEqualTo("asserted");
        verify(relationshipRepository, never()).save(any(Relationship.class));
        verify(addressService, never()).resolveDerivedAddress(any(), any(), any());
    }

    @Test
    void bloodlineConnectedButUndefinedDerivedTermLeavesEdgeAsserted() {
        Relationship asserted = assertedEdge("bác");
        when(relationshipRepository.findByTreeIdAndType(
                TREE_ID, RelationshipService.TYPE_ASSERTED))
                .thenReturn(List.of(asserted));
        wireBloodlinePathBetweenAandB();
        // Connected, but the resolver cannot produce a displayable term (e.g. indeterminate order).
        when(addressService.resolveDerivedAddress(TREE_ID, A, B))
                .thenReturn(AddressResolution.unresolved(CanonicalResolution.indeterminateOrder()));

        List<ConflictWarning> warnings = service.scanForUpgrades(TREE_ID);

        assertThat(warnings).isEmpty();
        assertThat(asserted.getDerivationState()).isEqualTo("asserted");
        verify(relationshipRepository, never()).save(any(Relationship.class));
    }

    @Test
    void alreadyUpgradedEdgesAreIgnoredByTheScan() {
        Relationship verified = assertedEdge("bác");
        verified.setDerivationState("verified");
        when(relationshipRepository.findByTreeIdAndType(
                TREE_ID, RelationshipService.TYPE_ASSERTED))
                .thenReturn(List.of(verified));

        List<ConflictWarning> warnings = service.scanForUpgrades(TREE_ID);

        assertThat(warnings).isEmpty();
        // No connectivity build or derivation for an edge that is no longer asserted.
        verify(relationshipRepository, never())
                .findByTreeIdAndType(eq(TREE_ID), eq(RelationshipService.TYPE_BLOODLINE_FATHER));
        verify(relationshipRepository, never()).save(any(Relationship.class));
    }
}
