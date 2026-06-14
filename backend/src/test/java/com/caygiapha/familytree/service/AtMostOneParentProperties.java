package com.caygiapha.familytree.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.caygiapha.familytree.entity.Relationship;
import com.caygiapha.familytree.error.ApiException;
import com.caygiapha.familytree.error.ErrorCode;
import com.caygiapha.familytree.repository.PersonRepository;
import com.caygiapha.familytree.repository.RelationshipRepository;
import com.caygiapha.familytree.service.RelationshipService.CreateRelationshipCommand;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import net.jqwik.api.Arbitraries;
import net.jqwik.api.Arbitrary;
import net.jqwik.api.Combinators;
import net.jqwik.api.ForAll;
import net.jqwik.api.Property;
import net.jqwik.api.Provide;

/**
 * Feature: vietnamese-family-tree, Property 7
 *
 * <p><strong>Property 7: At-most-one father and one mother.</strong> For any sequence of
 * bloodline-edge insertions, every child node ends with at most one father-child edge and at most
 * one mother-child edge; the first father (or mother) for a child succeeds and any second
 * father (or mother) for the same child is rejected.
 *
 * <p>Validates: Requirements 4.4.
 *
 * <p>The {@link RelationshipRepository} is backed by a stateful in-memory list so a sequence of
 * bloodline insertions is simulated: {@code existsByTargetIdAndType} and {@code findByTargetId}
 * reflect prior successful inserts, and {@code save} appends to the store.
 * {@link PersonRepository#existsByIdAndTreeId} returns {@code true} for every generated node.
 */
class AtMostOneParentProperties {

    /** A single bloodline-edge insertion request: a child (by index) and the parent role. */
    record Insertion(int childIndex, String type) {
    }

    @Provide
    Arbitrary<List<Insertion>> insertionSequences() {
        Arbitrary<Integer> childIndex = Arbitraries.integers().between(0, 4);
        Arbitrary<String> parentType = Arbitraries.of(
                RelationshipService.TYPE_BLOODLINE_FATHER,
                RelationshipService.TYPE_BLOODLINE_MOTHER);
        Arbitrary<Insertion> insertion =
                Combinators.combine(childIndex, parentType).as(Insertion::new);
        return insertion.list().ofMinSize(1).ofMaxSize(20);
    }

    @Property(tries = 200)
    void atMostOneFatherAndOneMotherPerChild(
            @ForAll("insertionSequences") List<Insertion> insertions) {
        UUID treeId = UUID.randomUUID();

        // Stateful in-memory backing store for the relationship repository.
        List<Relationship> store = new ArrayList<>();
        RelationshipRepository relationshipRepository = mock(RelationshipRepository.class);
        PersonRepository personRepository = mock(PersonRepository.class);

        when(personRepository.existsByIdAndTreeId(any(UUID.class), any(UUID.class)))
                .thenReturn(true);
        when(relationshipRepository.save(any(Relationship.class))).thenAnswer(invocation -> {
            Relationship saved = invocation.getArgument(0);
            store.add(saved);
            return saved;
        });
        when(relationshipRepository.existsByTargetIdAndType(any(UUID.class), any(String.class)))
                .thenAnswer(invocation -> {
                    UUID target = invocation.getArgument(0);
                    String type = invocation.getArgument(1);
                    return store.stream().anyMatch(
                            r -> r.getTargetId().equals(target) && r.getType().equals(type));
                });
        when(relationshipRepository.findByTargetId(any(UUID.class))).thenAnswer(invocation -> {
            UUID target = invocation.getArgument(0);
            return store.stream().filter(r -> r.getTargetId().equals(target)).toList();
        });

        KinshipGraphProjectionCache projectionCache = mock(KinshipGraphProjectionCache.class);
        RelationshipService service =
                new RelationshipService(relationshipRepository, personRepository, projectionCache);

        // Fixed pool of child node identities; parents are fresh unique nodes per insertion so no
        // cycle or self-reference is ever introduced and the only constraint exercised is 4.4.
        UUID[] children = new UUID[5];
        for (int i = 0; i < children.length; i++) {
            children[i] = UUID.randomUUID();
        }

        // Model of which (child, parent-role) pairs have already been accepted.
        Map<UUID, Set<String>> acceptedRoles = new HashMap<>();

        for (Insertion insertion : insertions) {
            UUID child = children[insertion.childIndex()];
            UUID parent = UUID.randomUUID();
            String type = insertion.type();
            boolean childAlreadyHasRole =
                    acceptedRoles.getOrDefault(child, Set.of()).contains(type);

            CreateRelationshipCommand command = new CreateRelationshipCommand(
                    treeId, type, parent, child, null, null, null);

            if (childAlreadyHasRole) {
                // A second father/mother for the same child must be rejected with PARENT_LIMIT.
                assertThatThrownBy(() -> service.createRelationship(command))
                        .isInstanceOfSatisfying(ApiException.class,
                                ex -> assertThat(ex.code()).isEqualTo(ErrorCode.PARENT_LIMIT));
            } else {
                // The first father/mother for the child succeeds.
                Relationship created = service.createRelationship(command);
                assertThat(created).isNotNull();
                assertThat(created.getTargetId()).isEqualTo(child);
                assertThat(created.getType()).isEqualTo(type);
                acceptedRoles.computeIfAbsent(child, k -> new HashSet<>()).add(type);
            }
        }

        // Final invariant: every child has at most one father edge and at most one mother edge.
        for (UUID child : children) {
            long fatherEdges = store.stream()
                    .filter(r -> r.getTargetId().equals(child)
                            && r.getType().equals(RelationshipService.TYPE_BLOODLINE_FATHER))
                    .count();
            long motherEdges = store.stream()
                    .filter(r -> r.getTargetId().equals(child)
                            && r.getType().equals(RelationshipService.TYPE_BLOODLINE_MOTHER))
                    .count();
            assertThat(fatherEdges).isLessThanOrEqualTo(1);
            assertThat(motherEdges).isLessThanOrEqualTo(1);
        }
    }
}
