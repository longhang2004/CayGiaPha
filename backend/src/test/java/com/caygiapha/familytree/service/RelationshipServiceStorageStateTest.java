package com.caygiapha.familytree.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.caygiapha.familytree.entity.Relationship;
import com.caygiapha.familytree.error.ApiException;
import com.caygiapha.familytree.error.ErrorCode;
import com.caygiapha.familytree.repository.PersonRepository;
import com.caygiapha.familytree.repository.RelationshipRepository;
import com.caygiapha.familytree.service.RelationshipService.CreateRelationshipCommand;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

/**
 * Unit tests for the asserted/derived storage state set by {@link RelationshipService} (task 4.1;
 * design: <em>Asserted vs Derived Relationships — Storage and rendering</em>).
 *
 * <p>Confirms the rendering-state contract the frontend relies on to draw solid vs dashed lines:
 *
 * <ul>
 *   <li>parent-child edges are stored as {@code Primitive_Bloodline_Edge} with
 *       {@code derivation_state = 'derived'} (solid); (5.1, 5.3)</li>
 *   <li>spouse edges are stored as {@code Marriage_Edge} with {@code derivation_state = 'derived'}
 *       (solid); (5.2, 5.3)</li>
 *   <li>direct-label edges are stored as {@code Asserted_Relationship} with the stored label and
 *       {@code derivation_state = 'asserted'} (dashed). (6.1, 6.3)</li>
 * </ul>
 */
class RelationshipServiceStorageStateTest {

    private static final UUID TREE_ID = UUID.randomUUID();
    private static final UUID SOURCE = UUID.randomUUID();
    private static final UUID TARGET = UUID.randomUUID();

    private RelationshipRepository relationshipRepository;
    private RelationshipService service;

    @BeforeEach
    void setUp() {
        relationshipRepository = mock(RelationshipRepository.class);
        PersonRepository personRepository = mock(PersonRepository.class);
        KinshipGraphProjectionCache projectionCache = mock(KinshipGraphProjectionCache.class);

        // Both endpoints exist in the tree, and no pre-existing parent/ancestor edges.
        when(personRepository.existsByIdAndTreeId(any(UUID.class), eq(TREE_ID))).thenReturn(true);
        // save() echoes the entity so we can inspect the stored state.
        when(relationshipRepository.save(any(Relationship.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        service = new RelationshipService(relationshipRepository, personRepository, projectionCache);
    }

    @Test
    void parentChildEdgeIsStoredAsDerivedBloodline() {
        Relationship edge = service.createRelationship(new CreateRelationshipCommand(
                TREE_ID, RelationshipService.TYPE_BLOODLINE_FATHER, SOURCE, TARGET,
                null, null, null));

        assertThat(edge.getType()).isEqualTo(RelationshipService.TYPE_BLOODLINE_FATHER);
        assertThat(edge.getDerivationState()).isEqualTo("derived");
        assertThat(edge.getAssertedLabel()).isNull();
    }

    @Test
    void spouseEdgeIsStoredAsDerivedMarriage() {
        Relationship edge = service.createRelationship(new CreateRelationshipCommand(
                TREE_ID, RelationshipService.TYPE_MARRIAGE, SOURCE, TARGET,
                "married", null, null));

        assertThat(edge.getType()).isEqualTo(RelationshipService.TYPE_MARRIAGE);
        assertThat(edge.getMaritalStatus()).isEqualTo("married");
        assertThat(edge.getDerivationState()).isEqualTo("derived");
    }

    @Test
    void directLabelEdgeIsStoredAsAssertedWithLabel() {
        Relationship edge = service.createRelationship(new CreateRelationshipCommand(
                TREE_ID, RelationshipService.TYPE_ASSERTED, SOURCE, TARGET,
                null, null, "bác"));

        assertThat(edge.getType()).isEqualTo(RelationshipService.TYPE_ASSERTED);
        assertThat(edge.getDerivationState()).isEqualTo("asserted");
        assertThat(edge.getAssertedLabel()).isEqualTo("bác");
    }

    @Test
    void assertedOverlayOnFatherEdgeIsRejected() {
        when(relationshipRepository.findFirstBySourceIdAndTargetIdAndType(
                SOURCE, TARGET, RelationshipService.TYPE_BLOODLINE_FATHER))
                .thenReturn(Optional.of(new Relationship(
                        TREE_ID, RelationshipService.TYPE_BLOODLINE_FATHER, SOURCE, TARGET)));

        assertThatThrownBy(() -> service.createRelationship(new CreateRelationshipCommand(
                TREE_ID, RelationshipService.TYPE_ASSERTED, SOURCE, TARGET,
                null, null, "bác")))
                .isInstanceOfSatisfying(ApiException.class, ex -> {
                    assertThat(ex.code()).isEqualTo(ErrorCode.VALIDATION_ERROR);
                    assertThat(ex.field()).isEqualTo("relationship");
                    assertThat(ex.getMessage()).contains("parent, child, or spouse");
                });
    }

    @Test
    void assertedOverlayOnReverseMotherEdgeIsRejected() {
        when(relationshipRepository.findFirstBySourceIdAndTargetIdAndType(
                TARGET, SOURCE, RelationshipService.TYPE_BLOODLINE_MOTHER))
                .thenReturn(Optional.of(new Relationship(
                        TREE_ID, RelationshipService.TYPE_BLOODLINE_MOTHER, TARGET, SOURCE)));

        assertThatThrownBy(() -> service.createRelationship(new CreateRelationshipCommand(
                TREE_ID, RelationshipService.TYPE_ASSERTED, SOURCE, TARGET,
                null, null, "mẹ")))
                .isInstanceOf(ApiException.class)
                .hasMessageContaining("parent, child, or spouse");
    }

    @Test
    void assertedOverlayOnMarriageEdgeIsRejected() {
        when(relationshipRepository.findFirstBySourceIdAndTargetIdAndType(
                TARGET, SOURCE, RelationshipService.TYPE_MARRIAGE))
                .thenReturn(Optional.of(new Relationship(
                        TREE_ID, RelationshipService.TYPE_MARRIAGE, TARGET, SOURCE)));

        assertThatThrownBy(() -> service.createRelationship(new CreateRelationshipCommand(
                TREE_ID, RelationshipService.TYPE_ASSERTED, SOURCE, TARGET,
                null, null, "vợ")))
                .isInstanceOf(ApiException.class)
                .hasMessageContaining("parent, child, or spouse");
    }
}
