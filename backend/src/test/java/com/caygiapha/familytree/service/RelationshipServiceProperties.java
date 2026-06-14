package com.caygiapha.familytree.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

import com.caygiapha.familytree.entity.Relationship;
import com.caygiapha.familytree.error.ApiException;
import com.caygiapha.familytree.error.ErrorCode;
import com.caygiapha.familytree.repository.PersonRepository;
import com.caygiapha.familytree.repository.RelationshipRepository;
import com.caygiapha.familytree.service.RelationshipService.CreateRelationshipCommand;
import java.util.UUID;
import net.jqwik.api.Arbitraries;
import net.jqwik.api.Arbitrary;
import net.jqwik.api.Combinators;
import net.jqwik.api.ForAll;
import net.jqwik.api.Property;
import net.jqwik.api.Provide;

/**
 * Property-based tests for {@link RelationshipService} edge-creation invariants.
 *
 * <p>Feature: vietnamese-family-tree, Property 6
 *
 * <p><strong>Property 6: No self-referencing edge</strong> — for any person and any edge type, a
 * create-relationship request whose source and target are the same person is rejected.
 *
 * <p><strong>Validates: Requirements 4.1, 4.2</strong>
 */
class RelationshipServiceProperties {

    /** All five supported edge-type discriminators (Requirement 4.x). */
    @Provide
    Arbitrary<String> edgeTypes() {
        return Arbitraries.of(
                RelationshipService.TYPE_BLOODLINE_FATHER,
                RelationshipService.TYPE_BLOODLINE_MOTHER,
                RelationshipService.TYPE_MARRIAGE,
                RelationshipService.TYPE_NON_BLOODLINE,
                RelationshipService.TYPE_ASSERTED);
    }

    /** Random UUIDs derived from two longs so jqwik can shrink the generated identifiers. */
    @Provide
    Arbitrary<UUID> uuids() {
        return Combinators.combine(Arbitraries.longs(), Arbitraries.longs())
                .as(UUID::new);
    }

    /**
     * Feature: vietnamese-family-tree, Property 6
     *
     * <p>For any valid edge type and any person id, a create-relationship request with
     * {@code sourceId == targetId} is rejected with a self-reference violation and nothing is
     * persisted. The self-reference check runs after type validation and before node-existence and
     * type-specific checks, so the rejection holds regardless of whether the node exists; the
     * generated type is always one of the five valid discriminators.
     */
    @Property(tries = 200)
    void selfReferencingEdgeOfAnyTypeIsRejected(
            @ForAll("edgeTypes") String type,
            @ForAll("uuids") UUID treeId,
            @ForAll("uuids") UUID personId) {

        RelationshipRepository relationshipRepository = mock(RelationshipRepository.class);
        PersonRepository personRepository = mock(PersonRepository.class);
        KinshipGraphProjectionCache projectionCache = mock(KinshipGraphProjectionCache.class);
        RelationshipService service =
                new RelationshipService(relationshipRepository, personRepository, projectionCache);

        // Source and target are the same person; type-specific payloads are populated so the only
        // possible ground for rejection is the self-reference, not a missing type-specific field.
        CreateRelationshipCommand command = new CreateRelationshipCommand(
                treeId, type, personId, personId, "married", "friend", "bác");

        assertThatThrownBy(() -> service.createRelationship(command))
                .isInstanceOfSatisfying(ApiException.class,
                        ex -> assertThat(ex.code()).isEqualTo(ErrorCode.SELF_REFERENCE));

        // SHALL NOT create: no edge persisted on rejection.
        verify(relationshipRepository, never()).save(any(Relationship.class));
    }
}
