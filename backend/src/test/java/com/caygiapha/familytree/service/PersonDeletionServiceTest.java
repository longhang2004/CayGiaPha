package com.caygiapha.familytree.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.caygiapha.familytree.dto.DeletionChoiceResponse;
import com.caygiapha.familytree.dto.DeletionChoiceResponse.DeletionOption;
import com.caygiapha.familytree.entity.Person;
import com.caygiapha.familytree.entity.Relationship;
import com.caygiapha.familytree.error.ApiException;
import com.caygiapha.familytree.error.ErrorCode;
import com.caygiapha.familytree.repository.PersonRepository;
import com.caygiapha.familytree.repository.RelationshipRepository;
import com.caygiapha.familytree.service.CanonicalRelation.BranchOrder;
import com.caygiapha.familytree.service.CanonicalRelation.Gender;
import com.caygiapha.familytree.service.CanonicalRelation.Side;
import com.caygiapha.familytree.service.RelationshipService.CreateRelationshipCommand;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.StreamSupport;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

/**
 * Unit tests for {@link PersonDeletionService} (Requirement 15 two-phase deletion):
 *
 * <ul>
 *   <li>phase 1 ({@code DELETE}) returns exactly the two strategy options and mutates nothing
 *       (15.1, 15.2); a nonexistent target is rejected (3.4, 15.10);</li>
 *   <li>phase 2 cascade removes the target and its edges and transitively removes nodes made
 *       edgeless as a result, while retaining pre-existing isolates (15.3); a nonexistent target
 *       is rejected (15.10).</li>
 * </ul>
 */
class PersonDeletionServiceTest {

    private final UUID treeId = UUID.randomUUID();

    private PersonRepository personRepository;
    private RelationshipRepository relationshipRepository;
    private KinshipGraphProjectionCache projectionCache;
    private KinshipAddressService addressService;
    private RelationshipService relationshipService;
    private PersonDeletionService service;

    @BeforeEach
    void setUp() {
        personRepository = mock(PersonRepository.class);
        relationshipRepository = mock(RelationshipRepository.class);
        projectionCache = mock(KinshipGraphProjectionCache.class);
        addressService = mock(KinshipAddressService.class);
        relationshipService = mock(RelationshipService.class);
        service = new PersonDeletionService(
                personRepository, relationshipRepository, projectionCache,
                addressService, relationshipService);
    }

    // ----- Phase 1: prompt (15.1, 15.2, 15.10) -----

    @Test
    void beginDeletionReturnsTwoOptionsAndMutatesNothing() {
        UUID target = existingPerson();

        DeletionChoiceResponse response = service.beginDeletion(treeId, target);

        assertThat(response.personId()).isEqualTo(target);
        assertThat(response.options())
                .extracting(DeletionOption::strategy)
                .containsExactlyInAnyOrder("cascade", "preserve");
        // 15.2 — no relationship or person is touched while only prompting.
        verify(relationshipRepository, never()).deleteAll(any());
        verify(relationshipRepository, never()).findByTreeId(any());
        verify(personRepository, never()).deleteAll(any());
        verify(projectionCache, never()).evict(any());
    }

    @Test
    void beginDeletionRejectsNonexistentTarget() {
        UUID target = UUID.randomUUID();
        when(personRepository.findByIdAndTreeId(target, treeId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.beginDeletion(treeId, target))
                .isInstanceOfSatisfying(ApiException.class,
                        ex -> assertThat(ex.code()).isEqualTo(ErrorCode.NODE_NOT_ACCESSIBLE));
    }

    // ----- Phase 2: cascade (15.3, 15.10) -----

    @Test
    void cascadeRemovesTargetAndItsEdgeAndTheNeighborMadeEdgeless() {
        UUID target = existingPerson();
        UUID neighbor = existingPerson();
        Relationship edge = edge(target, neighbor);
        when(relationshipRepository.findByTreeId(treeId)).thenReturn(List.of(edge));

        service.deleteCascade(treeId, target);

        // Target's edge removed; both the target and the now-edgeless neighbor removed.
        assertThat(capturedDeletedEdges()).containsExactly(edge);
        assertThat(capturedDeletedPersonIds()).containsExactlyInAnyOrder(target, neighbor);
        verify(projectionCache).evict(treeId);
    }

    @Test
    void cascadeRemovesAllNeighborsLeftEdgelessByTheTarget() {
        // Star: target connected to A and B (and nothing else). Removing the target isolates both.
        UUID target = existingPerson();
        UUID a = existingPerson();
        UUID b = existingPerson();
        Relationship ta = edge(target, a);
        Relationship tb = edge(target, b);
        when(relationshipRepository.findByTreeId(treeId)).thenReturn(List.of(ta, tb));

        service.deleteCascade(treeId, target);

        assertThat(capturedDeletedEdges()).containsExactlyInAnyOrder(ta, tb);
        assertThat(capturedDeletedPersonIds()).containsExactlyInAnyOrder(target, a, b);
    }

    @Test
    void cascadeRetainsNeighborThatKeepsAnotherEdge() {
        // target - A - B : after removing the target, A still has its edge to B, so both survive.
        UUID target = existingPerson();
        UUID a = existingPerson();
        UUID b = existingPerson();
        Relationship ta = edge(target, a);
        Relationship ab = edge(a, b);
        when(relationshipRepository.findByTreeId(treeId)).thenReturn(List.of(ta, ab));

        service.deleteCascade(treeId, target);

        // Only the target's own edge is removed; the A-B edge is retained.
        assertThat(capturedDeletedEdges()).containsExactly(ta);
        // Only the target is removed; A (still linked to B) and B are retained.
        assertThat(capturedDeletedPersonIds()).containsExactly(target);
    }

    @Test
    void cascadeRetainsPreExistingIsolatesAndUnrelatedComponents() {
        UUID target = existingPerson();
        UUID neighbor = existingPerson();
        existingPerson(); // a pre-existing isolate with no edges at all (must be retained, 15.3)
        UUID x = existingPerson();
        UUID y = existingPerson();
        Relationship targetEdge = edge(target, neighbor);
        Relationship unrelated = edge(x, y); // separate connected component, untouched
        when(relationshipRepository.findByTreeId(treeId))
                .thenReturn(List.of(targetEdge, unrelated));

        service.deleteCascade(treeId, target);

        // The unrelated component's edge survives; only the target's edge is removed.
        assertThat(capturedDeletedEdges()).containsExactly(targetEdge);
        // Pre-existing isolate and the unrelated pair are all retained.
        assertThat(capturedDeletedPersonIds()).containsExactlyInAnyOrder(target, neighbor);
    }

    @Test
    void cascadeOnIsolatedTargetRemovesOnlyTheTarget() {
        UUID target = existingPerson();
        when(relationshipRepository.findByTreeId(treeId)).thenReturn(List.of());

        service.deleteCascade(treeId, target);

        assertThat(capturedDeletedPersonIds()).containsExactly(target);
        verify(projectionCache).evict(treeId);
    }

    @Test
    void cascadeRejectsNonexistentTarget() {
        UUID target = UUID.randomUUID();
        when(personRepository.findByIdAndTreeId(target, treeId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.deleteCascade(treeId, target))
                .isInstanceOfSatisfying(ApiException.class,
                        ex -> assertThat(ex.code()).isEqualTo(ErrorCode.NODE_NOT_ACCESSIBLE));
        verify(relationshipRepository, never()).deleteAll(any());
        verify(personRepository, never()).deleteAll(any());
        verify(projectionCache, never()).evict(any());
    }

    // ----- Phase 2 dispatch -----

    @Test
    void executeRejectsUnknownStrategyAndMutatesNothing() {
        UUID target = UUID.randomUUID();

        assertThatThrownBy(() -> service.execute(treeId, target, "obliterate"))
                .isInstanceOfSatisfying(ApiException.class, ex -> {
                    assertThat(ex.code()).isEqualTo(ErrorCode.VALIDATION_ERROR);
                    assertThat(ex.field()).isEqualTo("strategy");
                });
        verify(relationshipRepository, never()).deleteAll(any());
        verify(personRepository, never()).deleteAll(any());
    }

    @Test
    void executeWithCascadeRunsTheCascade() {
        UUID target = existingPerson();
        when(relationshipRepository.findByTreeId(treeId)).thenReturn(List.of());

        service.execute(treeId, target, "cascade");

        assertThat(capturedDeletedPersonIds()).containsExactly(target);
    }

    @Test
    void executeWithPreserveRunsNeighborPreservation() {
        // T is father of A and B; A and B have no other links, so removing T isolates both.
        UUID target = existingPerson();
        UUID a = existingPerson();
        UUID b = existingPerson();
        Relationship ta = edge(target, a);
        Relationship tb = edge(target, b);
        stubGraph(List.of(ta, tb));
        // Pre-deletion address A -> B is defined.
        when(addressService.resolveAddress(treeId, a, b)).thenReturn(resolved("anh"));

        service.execute(treeId, target, "preserve");

        // Cut-node pair with a defined address -> one asserted edge A -> B labeled with that address.
        CreateRelationshipCommand created = capturedCreatedEdge();
        assertThat(created.type()).isEqualTo("asserted");
        assertThat(created.sourceId()).isEqualTo(a);
        assertThat(created.targetId()).isEqualTo(b);
        assertThat(created.assertedLabel()).isEqualTo("anh");
    }

    // ----- Phase 2: neighbor preservation (15.4-15.9) -----

    @Test
    void preserveRetainsAllFormerNeighborsEvenWhenIsolated() {
        // Star: T is father of A and B; both become isolated after the deletion but are retained.
        UUID target = existingPerson();
        UUID a = existingPerson();
        UUID b = existingPerson();
        stubGraph(List.of(edge(target, a), edge(target, b)));
        when(addressService.resolveAddress(treeId, a, b)).thenReturn(resolved("anh"));

        service.deletePreserve(treeId, target);

        // Only the target node is removed; both former neighbors are retained (15.4, 15.8).
        assertThat(capturedSingleDeletedPersonId()).isEqualTo(target);
        verify(personRepository, never()).deleteAll(any());
        verify(projectionCache).evict(treeId);
    }

    @Test
    void preserveCreatesAssertedEdgeForCutNodePairWithDefinedAddress() {
        // T is the only derived link between A and B; removing T disconnects them (cut node).
        UUID target = existingPerson();
        UUID a = existingPerson();
        UUID b = existingPerson();
        stubGraph(List.of(edge(target, a), edge(target, b)));
        when(addressService.resolveAddress(treeId, a, b)).thenReturn(resolved("anh"));

        service.deletePreserve(treeId, target);

        CreateRelationshipCommand created = capturedCreatedEdge();
        assertThat(created.type()).isEqualTo("asserted");
        assertThat(created.sourceId()).isEqualTo(a);
        assertThat(created.targetId()).isEqualTo(b);
        assertThat(created.assertedLabel()).isEqualTo("anh");
    }

    @Test
    void preserveCreatesNoEdgeForPairStillConnectedByAnotherDerivedPath() {
        // T is father of A and B, but A and B are also married, so removing T leaves them connected.
        UUID target = existingPerson();
        UUID a = existingPerson();
        UUID b = existingPerson();
        stubGraph(List.of(edge(target, a), edge(target, b), marriage(a, b)));
        when(addressService.resolveAddress(treeId, a, b)).thenReturn(resolved("anh"));

        service.deletePreserve(treeId, target);

        // Their derived path survives the deletion, so no asserted edge is needed (15.5).
        verify(relationshipService, never()).createRelationship(any());
        assertThat(capturedSingleDeletedPersonId()).isEqualTo(target);
    }

    @Test
    void preserveCreatesNoEdgeForPairWhosePreDeletionAddressWasUndefined() {
        // Cut-node pair, but the pre-deletion address is undefined -> no asserted edge (15.7).
        UUID target = existingPerson();
        UUID a = existingPerson();
        UUID b = existingPerson();
        stubGraph(List.of(edge(target, a), edge(target, b)));
        when(addressService.resolveAddress(treeId, a, b))
                .thenReturn(AddressResolution.undefinedForRegion(
                        CanonicalResolution.resolved(canonical())));

        service.deletePreserve(treeId, target);

        verify(relationshipService, never()).createRelationship(any());
    }

    @Test
    void preserveRejectsNonexistentTarget() {
        UUID target = UUID.randomUUID();
        when(personRepository.findByIdAndTreeId(target, treeId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.deletePreserve(treeId, target))
                .isInstanceOfSatisfying(ApiException.class,
                        ex -> assertThat(ex.code()).isEqualTo(ErrorCode.NODE_NOT_ACCESSIBLE));
        verify(relationshipRepository, never()).deleteAll(any());
        verify(relationshipService, never()).createRelationship(any());
        verify(projectionCache, never()).evict(any());
    }

    // ----- fixtures / helpers -----

    /** Register a person as existing in the tree and return its id. */
    private UUID existingPerson() {
        UUID id = UUID.randomUUID();
        Person p = new Person(treeId, "n", "male");
        setId(p, id);
        when(personRepository.findByIdAndTreeId(id, treeId)).thenReturn(Optional.of(p));
        return p.getId();
    }

    private Relationship edge(UUID source, UUID target) {
        return new Relationship(treeId, "bloodline_father", source, target);
    }

    private Relationship marriage(UUID a, UUID b) {
        return new Relationship(treeId, "marriage", a, b);
    }

    /** Stub the tree's edge set and the cached pre-deletion projection built from it. */
    private void stubGraph(List<Relationship> edges) {
        when(relationshipRepository.findByTreeId(treeId)).thenReturn(edges);
        when(projectionCache.getProjection(treeId))
                .thenReturn(KinshipGraphProjection.fromEdges(treeId, edges));
    }

    /** A defined (RESOLVED) address carrying the given term. */
    private static AddressResolution resolved(String term) {
        return AddressResolution.resolved(term, CanonicalResolution.resolved(canonical()));
    }

    /** An arbitrary canonical relation, sufficient for constructing address resolutions in tests. */
    private static CanonicalRelation canonical() {
        return new CanonicalRelation(1, 1, Side.PATERNAL, Gender.MALE, BranchOrder.ELDER, false);
    }

    private CreateRelationshipCommand capturedCreatedEdge() {
        ArgumentCaptor<CreateRelationshipCommand> captor =
                ArgumentCaptor.forClass(CreateRelationshipCommand.class);
        verify(relationshipService).createRelationship(captor.capture());
        return captor.getValue();
    }

    private UUID capturedSingleDeletedPersonId() {
        ArgumentCaptor<Person> captor = ArgumentCaptor.forClass(Person.class);
        verify(personRepository).delete(captor.capture());
        return captor.getValue().getId();
    }

    @SuppressWarnings("unchecked")
    private List<Relationship> capturedDeletedEdges() {
        ArgumentCaptor<Iterable<Relationship>> captor = ArgumentCaptor.forClass(Iterable.class);
        verify(relationshipRepository).deleteAll(captor.capture());
        List<Relationship> result = new ArrayList<>();
        captor.getValue().forEach(result::add);
        return result;
    }

    @SuppressWarnings("unchecked")
    private List<UUID> capturedDeletedPersonIds() {
        ArgumentCaptor<Iterable<Person>> captor = ArgumentCaptor.forClass(Iterable.class);
        verify(personRepository).deleteAll(captor.capture());
        return StreamSupport.stream(captor.getValue().spliterator(), false)
                .map(Person::getId)
                .toList();
    }

    /** Set the JPA-managed id via reflection for test fixtures. */
    private static void setId(Person person, UUID id) {
        try {
            var field = Person.class.getDeclaredField("id");
            field.setAccessible(true);
            field.set(person, id);
        } catch (ReflectiveOperationException e) {
            throw new IllegalStateException(e);
        }
    }
}
