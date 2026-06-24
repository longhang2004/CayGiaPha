package com.caygiapha.familytree.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

import com.caygiapha.familytree.entity.Relationship;
import com.caygiapha.familytree.repository.PersonRepository;
import com.caygiapha.familytree.repository.RelationshipRepository;
import com.caygiapha.familytree.service.RelationshipService.CreateRelationshipCommand;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

class RelationshipServiceSpouseInferenceTest {

    private static final UUID TREE_ID = UUID.randomUUID();
    private static final UUID FATHER = UUID.randomUUID();
    private static final UUID MOTHER = UUID.randomUUID();
    private static final UUID CHILD = UUID.randomUUID();

    private RelationshipRepository relationshipRepository;
    private RelationshipService service;

    @BeforeEach
    void setUp() {
        relationshipRepository = mock(RelationshipRepository.class);
        PersonRepository personRepository = mock(PersonRepository.class);
        KinshipGraphProjectionCache projectionCache = mock(KinshipGraphProjectionCache.class);

        when(personRepository.existsByIdAndTreeId(any(UUID.class), eq(TREE_ID))).thenReturn(true);
        when(relationshipRepository.save(any(Relationship.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        service = new RelationshipService(relationshipRepository, personRepository, projectionCache);
    }

    @Test
    void addingFatherWhenMotherExistsCreatesMarriage() {
        // Child already has a mother edge
        Relationship motherEdge = new Relationship(TREE_ID, RelationshipService.TYPE_BLOODLINE_MOTHER, MOTHER, CHILD);
        when(relationshipRepository.findByTargetIdAndType(CHILD, RelationshipService.TYPE_BLOODLINE_MOTHER))
                .thenReturn(List.of(motherEdge));

        // No marriage edge exists yet
        when(relationshipRepository.findFirstBySourceIdAndTargetIdAndType(FATHER, MOTHER, RelationshipService.TYPE_MARRIAGE))
                .thenReturn(Optional.empty());
        when(relationshipRepository.findFirstBySourceIdAndTargetIdAndType(MOTHER, FATHER, RelationshipService.TYPE_MARRIAGE))
                .thenReturn(Optional.empty());

        // Create father edge
        Relationship fatherEdge = service.createRelationship(new CreateRelationshipCommand(
                TREE_ID, RelationshipService.TYPE_BLOODLINE_FATHER, FATHER, CHILD,
                null, null, null));

        assertThat(fatherEdge.getType()).isEqualTo(RelationshipService.TYPE_BLOODLINE_FATHER);

        // Verify that a marriage relationship was saved
        ArgumentCaptor<Relationship> captor = ArgumentCaptor.forClass(Relationship.class);
        verify(relationshipRepository, atLeastOnce()).save(captor.capture());

        List<Relationship> savedEdges = captor.getAllValues();
        boolean marriageSaved = savedEdges.stream().anyMatch(edge ->
                RelationshipService.TYPE_MARRIAGE.equals(edge.getType())
                        && FATHER.equals(edge.getSourceId())
                        && MOTHER.equals(edge.getTargetId())
                        && "married".equals(edge.getMaritalStatus())
        );
        assertThat(marriageSaved).isTrue();
    }

    @Test
    void addingMotherWhenFatherExistsCreatesMarriage() {
        // Child already has a father edge
        Relationship fatherEdge = new Relationship(TREE_ID, RelationshipService.TYPE_BLOODLINE_FATHER, FATHER, CHILD);
        when(relationshipRepository.findByTargetIdAndType(CHILD, RelationshipService.TYPE_BLOODLINE_FATHER))
                .thenReturn(List.of(fatherEdge));

        // No marriage edge exists yet
        when(relationshipRepository.findFirstBySourceIdAndTargetIdAndType(FATHER, MOTHER, RelationshipService.TYPE_MARRIAGE))
                .thenReturn(Optional.empty());
        when(relationshipRepository.findFirstBySourceIdAndTargetIdAndType(MOTHER, FATHER, RelationshipService.TYPE_MARRIAGE))
                .thenReturn(Optional.empty());

        // Create mother edge
        Relationship motherEdge = service.createRelationship(new CreateRelationshipCommand(
                TREE_ID, RelationshipService.TYPE_BLOODLINE_MOTHER, MOTHER, CHILD,
                null, null, null));

        assertThat(motherEdge.getType()).isEqualTo(RelationshipService.TYPE_BLOODLINE_MOTHER);

        // Verify that a marriage relationship was saved
        ArgumentCaptor<Relationship> captor = ArgumentCaptor.forClass(Relationship.class);
        verify(relationshipRepository, atLeastOnce()).save(captor.capture());

        List<Relationship> savedEdges = captor.getAllValues();
        boolean marriageSaved = savedEdges.stream().anyMatch(edge ->
                RelationshipService.TYPE_MARRIAGE.equals(edge.getType())
                        && FATHER.equals(edge.getSourceId())
                        && MOTHER.equals(edge.getTargetId())
                        && "married".equals(edge.getMaritalStatus())
        );
        assertThat(marriageSaved).isTrue();
    }

    @Test
    void addingFatherWhenMotherExistsButMarriageAlreadyExistsDoesNotCreateDuplicate() {
        // Child already has a mother edge
        Relationship motherEdge = new Relationship(TREE_ID, RelationshipService.TYPE_BLOODLINE_MOTHER, MOTHER, CHILD);
        when(relationshipRepository.findByTargetIdAndType(CHILD, RelationshipService.TYPE_BLOODLINE_MOTHER))
                .thenReturn(List.of(motherEdge));

        // Marriage edge already exists
        Relationship existingMarriage = new Relationship(TREE_ID, RelationshipService.TYPE_MARRIAGE, FATHER, MOTHER);
        when(relationshipRepository.findFirstBySourceIdAndTargetIdAndType(FATHER, MOTHER, RelationshipService.TYPE_MARRIAGE))
                .thenReturn(Optional.of(existingMarriage));

        // Create father edge
        service.createRelationship(new CreateRelationshipCommand(
                TREE_ID, RelationshipService.TYPE_BLOODLINE_FATHER, FATHER, CHILD,
                null, null, null));

        // Verify save was called only once (for the father edge itself, not for marriage)
        verify(relationshipRepository, times(1)).save(any(Relationship.class));
    }

    @Test
    void addingFatherWhenMotherDoesNotExistDoesNotCreateMarriage() {
        // No mother edge
        when(relationshipRepository.findByTargetIdAndType(CHILD, RelationshipService.TYPE_BLOODLINE_MOTHER))
                .thenReturn(List.of());

        // Create father edge
        service.createRelationship(new CreateRelationshipCommand(
                TREE_ID, RelationshipService.TYPE_BLOODLINE_FATHER, FATHER, CHILD,
                null, null, null));

        // Verify save was called only once (for the father edge itself, not for marriage)
        verify(relationshipRepository, times(1)).save(any(Relationship.class));
    }
}
