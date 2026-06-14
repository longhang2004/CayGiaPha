package com.caygiapha.familytree.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.caygiapha.familytree.entity.Relationship;
import com.caygiapha.familytree.error.ApiException;
import com.caygiapha.familytree.error.ErrorCode;
import com.caygiapha.familytree.repository.PersonRepository;
import com.caygiapha.familytree.repository.RelationshipRepository;
import com.caygiapha.familytree.service.RelationshipService.CreateRelationshipCommand;
import java.util.UUID;
import net.jqwik.api.Arbitraries;
import net.jqwik.api.Arbitrary;
import net.jqwik.api.ForAll;
import net.jqwik.api.Property;
import net.jqwik.api.Provide;
import org.mockito.invocation.InvocationOnMock;

/**
 * Property-based test for design <strong>Property 9: Asserted-label validation</strong>.
 *
 * <p>Feature: vietnamese-family-tree, Property 9
 *
 * <p>For any candidate label, an add-asserted-relationship request through
 * {@link RelationshipService#createRelationship} is accepted <em>if and only if</em> the label
 * length is 1-50 characters. An accepted request creates an {@code asserted} edge linking exactly
 * the two specified nodes with that label (and {@code derivation_state = 'asserted'}); a rejected
 * request creates nothing.
 *
 * <p><strong>Validates: Requirements 4.7, 6.1, 6.2</strong>
 */
class AssertedLabelProperties {

    /**
     * Feature: vietnamese-family-tree, Property 9.
     *
     * <p>Both endpoints are distinct nodes that exist in the tree (the person repository reports
     * {@code existsByIdAndTreeId == true}), so the only deciding factor is the label length.
     */
    @Property(tries = 200)
    void assertedRelationshipAcceptedIffLabelLength1To50(@ForAll("candidateLabels") String label) {
        // Fresh in-memory fakes per try so no state leaks between generated cases.
        PersonRepository personRepository = mock(PersonRepository.class);
        RelationshipRepository relationshipRepository = mock(RelationshipRepository.class);
        // The two generated nodes always exist in the tree.
        when(personRepository.existsByIdAndTreeId(any(), any())).thenReturn(true);
        // save() echoes back the entity so the test can inspect the persisted edge.
        when(relationshipRepository.save(any(Relationship.class)))
                .thenAnswer((InvocationOnMock i) -> i.getArgument(0));

        KinshipGraphProjectionCache projectionCache = mock(KinshipGraphProjectionCache.class);
        RelationshipService service =
                new RelationshipService(relationshipRepository, personRepository, projectionCache);

        UUID treeId = UUID.randomUUID();
        UUID sourceId = UUID.randomUUID();
        UUID targetId = UUID.randomUUID();
        // source and target are distinct by construction (random UUIDs).
        CreateRelationshipCommand command = new CreateRelationshipCommand(
                treeId, "asserted", sourceId, targetId, null, null, label);

        boolean shouldAccept = label != null && label.length() >= 1 && label.length() <= 50;

        if (shouldAccept) {
            Relationship edge = service.createRelationship(command);

            // Accepted edge links exactly the two specified nodes with the provided label.
            assertThat(edge.getType()).isEqualTo("asserted");
            assertThat(edge.getTreeId()).isEqualTo(treeId);
            assertThat(edge.getSourceId()).isEqualTo(sourceId);
            assertThat(edge.getTargetId()).isEqualTo(targetId);
            assertThat(edge.getAssertedLabel()).isEqualTo(label);
            assertThat(edge.getDerivationState()).isEqualTo("asserted");
            verify(relationshipRepository).save(any(Relationship.class));
        } else {
            // Rejected request: validation error naming the label field, and nothing persisted.
            assertThatThrownBy(() -> service.createRelationship(command))
                    .isInstanceOfSatisfying(ApiException.class, ex -> {
                        assertThat(ex.code()).isEqualTo(ErrorCode.VALIDATION_ERROR);
                        assertThat(ex.field()).isEqualTo("assertedLabel");
                    });
            verify(relationshipRepository, never()).save(any());
        }
    }

    /**
     * Labels of varying length, mixing boundary lengths (0, 1, 2, 49, 50, 51, 52, 100, 120) with
     * uniformly random lengths in [0, 120], built from a Latin/Latin-Extended character range so
     * Vietnamese-style characters (all BMP, so {@code String.length()} equals the character count)
     * are exercised alongside ASCII and whitespace.
     */
    @Provide
    Arbitrary<String> candidateLabels() {
        Arbitrary<Integer> boundaryLengths = Arbitraries.of(0, 1, 2, 49, 50, 51, 52, 100, 120);
        Arbitrary<Integer> randomLengths = Arbitraries.integers().between(0, 120);
        Arbitrary<Integer> lengths = Arbitraries.oneOf(boundaryLengths, randomLengths);
        return lengths.flatMap(len ->
                Arbitraries.strings().withCharRange('\u0020', '\u017F').ofLength(len));
    }
}
