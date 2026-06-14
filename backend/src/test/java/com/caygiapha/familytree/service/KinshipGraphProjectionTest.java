package com.caygiapha.familytree.service;

import static org.assertj.core.api.Assertions.assertThat;

import com.caygiapha.familytree.entity.Relationship;
import com.caygiapha.familytree.service.KinshipGraphProjection.ChildLink;
import com.caygiapha.familytree.service.KinshipGraphProjection.ParentLink;
import com.caygiapha.familytree.service.KinshipGraphProjection.Step;
import com.caygiapha.familytree.service.KinshipGraphProjection.StepKind;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;

/**
 * Unit tests for {@link KinshipGraphProjection} — the in-memory kinship graph projection
 * (design: <em>Kinship_Resolver Algorithm — Step 1</em>). Verifies bloodline and marriage adjacency
 * loading, the side/direction tagging, exclusion of {@code non_bloodline}/{@code asserted} edges,
 * and the traversal step view. (Requirements 6.4, 12.3)
 */
class KinshipGraphProjectionTest {

    private static Relationship edge(UUID treeId, String type, UUID source, UUID target) {
        return new Relationship(treeId, type, source, target);
    }

    @Test
    void bloodlineFatherEdgeCreatesPaternalParentAndChildAdjacency() {
        UUID tree = UUID.randomUUID();
        UUID father = UUID.randomUUID();
        UUID child = UUID.randomUUID();

        KinshipGraphProjection projection = KinshipGraphProjection.fromEdges(
                tree, List.of(edge(tree, "bloodline_father", father, child)));

        assertThat(projection.parentsOf(child))
                .containsExactly(new ParentLink(father, ParentType.FATHER));
        assertThat(projection.parentsOf(child).get(0).side()).isEqualTo(Side.PATERNAL);
        assertThat(projection.childrenOf(father))
                .containsExactly(new ChildLink(child, ParentType.FATHER));
        assertThat(projection.nodes()).containsExactlyInAnyOrder(father, child);
    }

    @Test
    void bloodlineMotherEdgeCarriesMaternalSide() {
        UUID tree = UUID.randomUUID();
        UUID mother = UUID.randomUUID();
        UUID child = UUID.randomUUID();

        KinshipGraphProjection projection = KinshipGraphProjection.fromEdges(
                tree, List.of(edge(tree, "bloodline_mother", mother, child)));

        assertThat(projection.parentsOf(child))
                .containsExactly(new ParentLink(mother, ParentType.MOTHER));
        assertThat(projection.parentsOf(child).get(0).side()).isEqualTo(Side.MATERNAL);
        assertThat(projection.childrenOf(mother).get(0).side()).isEqualTo(Side.MATERNAL);
    }

    @Test
    void childWithFatherAndMotherHasBothParentLinks() {
        UUID tree = UUID.randomUUID();
        UUID father = UUID.randomUUID();
        UUID mother = UUID.randomUUID();
        UUID child = UUID.randomUUID();

        KinshipGraphProjection projection = KinshipGraphProjection.fromEdges(tree, List.of(
                edge(tree, "bloodline_father", father, child),
                edge(tree, "bloodline_mother", mother, child)));

        assertThat(projection.parentsOf(child)).containsExactlyInAnyOrder(
                new ParentLink(father, ParentType.FATHER),
                new ParentLink(mother, ParentType.MOTHER));
    }

    @Test
    void marriageEdgeCreatesUndirectedSpouseAdjacency() {
        UUID tree = UUID.randomUUID();
        UUID a = UUID.randomUUID();
        UUID b = UUID.randomUUID();

        KinshipGraphProjection projection = KinshipGraphProjection.fromEdges(
                tree, List.of(edge(tree, "marriage", a, b)));

        assertThat(projection.spousesOf(a)).containsExactly(b);
        assertThat(projection.spousesOf(b)).containsExactly(a);
        assertThat(projection.nodes()).containsExactlyInAnyOrder(a, b);
    }

    @Test
    void nonBloodlineAndAssertedEdgesAreExcludedEntirely() {
        UUID tree = UUID.randomUUID();
        UUID a = UUID.randomUUID();
        UUID b = UUID.randomUUID();
        UUID c = UUID.randomUUID();
        UUID d = UUID.randomUUID();

        KinshipGraphProjection projection = KinshipGraphProjection.fromEdges(tree, List.of(
                edge(tree, "non_bloodline", a, b),
                edge(tree, "asserted", c, d)));

        // No adjacency contributed by excluded edges.
        assertThat(projection.parentsOf(a)).isEmpty();
        assertThat(projection.childrenOf(a)).isEmpty();
        assertThat(projection.spousesOf(a)).isEmpty();
        assertThat(projection.stepsFrom(c)).isEmpty();
        // Nodes touched only by excluded edges do not appear in the projection.
        assertThat(projection.nodes()).isEmpty();
        assertThat(projection.contains(a)).isFalse();
    }

    @Test
    void excludedEdgesDoNotAlterDerivedAdjacency() {
        UUID tree = UUID.randomUUID();
        UUID father = UUID.randomUUID();
        UUID child = UUID.randomUUID();
        UUID friend = UUID.randomUUID();

        KinshipGraphProjection derivedOnly = KinshipGraphProjection.fromEdges(
                tree, List.of(edge(tree, "bloodline_father", father, child)));
        KinshipGraphProjection withExcluded = KinshipGraphProjection.fromEdges(tree, List.of(
                edge(tree, "bloodline_father", father, child),
                edge(tree, "non_bloodline", child, friend),
                edge(tree, "asserted", father, friend)));

        // Adding non-bloodline/asserted edges changes neither adjacency nor the node set.
        assertThat(withExcluded.parentsOf(child)).isEqualTo(derivedOnly.parentsOf(child));
        assertThat(withExcluded.childrenOf(father)).isEqualTo(derivedOnly.childrenOf(father));
        assertThat(withExcluded.nodes()).isEqualTo(derivedOnly.nodes());
    }

    @Test
    void stepsFromCombinesUpDownAndSpouseNeighbours() {
        UUID tree = UUID.randomUUID();
        UUID parent = UUID.randomUUID();
        UUID ego = UUID.randomUUID();
        UUID childOfEgo = UUID.randomUUID();
        UUID spouse = UUID.randomUUID();

        KinshipGraphProjection projection = KinshipGraphProjection.fromEdges(tree, List.of(
                edge(tree, "bloodline_father", parent, ego),
                edge(tree, "bloodline_mother", ego, childOfEgo),
                edge(tree, "marriage", ego, spouse)));

        List<Step> steps = projection.stepsFrom(ego);
        assertThat(steps).containsExactlyInAnyOrder(
                new Step(parent, StepKind.UP, ParentType.FATHER),
                new Step(childOfEgo, StepKind.DOWN, ParentType.MOTHER),
                new Step(spouse, StepKind.SPOUSE, null));
        // Spouse step carries no side; bloodline steps do.
        assertThat(new Step(spouse, StepKind.SPOUSE, null).side()).isNull();
        assertThat(new Step(parent, StepKind.UP, ParentType.FATHER).side())
                .isEqualTo(Side.PATERNAL);
    }

    @Test
    void unknownNodeYieldsEmptyAdjacencyAndIsNotContained() {
        UUID tree = UUID.randomUUID();
        KinshipGraphProjection projection = KinshipGraphProjection.fromEdges(tree, List.of());

        UUID stranger = UUID.randomUUID();
        assertThat(projection.parentsOf(stranger)).isEmpty();
        assertThat(projection.childrenOf(stranger)).isEmpty();
        assertThat(projection.spousesOf(stranger)).isEmpty();
        assertThat(projection.stepsFrom(stranger)).isEmpty();
        assertThat(projection.contains(stranger)).isFalse();
        assertThat(projection.treeId()).isEqualTo(tree);
    }
}
