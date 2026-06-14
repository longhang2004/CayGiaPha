package com.caygiapha.familytree.service;

import static org.assertj.core.api.Assertions.assertThat;

import com.caygiapha.familytree.entity.Person;
import com.caygiapha.familytree.entity.Relationship;
import com.caygiapha.familytree.service.CanonicalRelation.Side;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import net.jqwik.api.Arbitraries;
import net.jqwik.api.Arbitrary;
import net.jqwik.api.Combinators;
import net.jqwik.api.ForAll;
import net.jqwik.api.Property;
import net.jqwik.api.Provide;

/**
 * Property-based tests for the resolver's paternal-vs-maternal side selection (design:
 * <em>Kinship_Resolver Algorithm — Step 3, Side</em>).
 *
 * <p>Feature: vietnamese-family-tree, Property 11
 *
 * <p><strong>Property 11: Side selection</strong> — the resolver selects the paternal side
 * ({@link Side#PATERNAL}, e.g. bác/chú) when the branch leaving ego's lineage toward the target
 * does so via a <em>father</em> link, and the maternal side ({@link Side#MATERNAL}, e.g. cậu) when
 * it does so via a <em>mother</em> link. Per the resolver, the side is fixed by the first up-step
 * leaving ego — that is, the link by which ego is connected to the parent on the branch's lineage.
 * (8.2, 8.3)
 *
 * <p>The fixture is the minimal uncle/aunt branch: a grandparent with two children — ego's
 * connecting parent and the parent's sibling (the target) — and ego as a child of the connecting
 * parent. Resolving {@code ego -> parentSibling} yields {@code upCount = 2}, {@code downCount = 1},
 * so the branch leaves ego's line at ego's connecting parent, and the first up-step is exactly the
 * {@code egoParent -> ego} link. We generate that link as a father or mother edge and assert the
 * resulting side accordingly. The grandparent's two links are independently varied to demonstrate
 * that only the first up-step (the link leaving ego) determines the side.
 *
 * <p>Birth orders of ego's connecting parent and the parent's sibling are always distinct, so the
 * elder/younger distinction is determinate and the relation resolves (it never collapses to the
 * indeterminate-order unresolved indicator).
 *
 * <p><strong>Validates: Requirements 8.2, 8.3</strong>
 */
class SideSelectionProperties {

    private static final UUID TREE_ID = new UUID(11L, 11L);

    /**
     * One generated case for the uncle/aunt branch.
     *
     * @param connectingLink the {@code egoParent -> ego} link (the first up-step leaving ego); this
     *     alone determines the expected side
     * @param gpToParentLink the {@code grandparent -> egoParent} link (varied to show it is
     *     irrelevant to the side)
     * @param gpToSibLink the {@code grandparent -> parentSibling} link (varied to show it is
     *     irrelevant to the side)
     * @param egoParentOrder birth order of ego's connecting parent
     * @param sibOrder birth order of the parent's sibling (always distinct from {@code egoParentOrder})
     * @param targetGender gender of the target (orthogonal to side)
     */
    private record SideCase(
            ParentType connectingLink,
            ParentType gpToParentLink,
            ParentType gpToSibLink,
            int egoParentOrder,
            int sibOrder,
            String targetGender) {}

    @Provide
    Arbitrary<SideCase> sideCases() {
        Arbitrary<ParentType> link = Arbitraries.of(ParentType.FATHER, ParentType.MOTHER);
        Arbitrary<Integer> order = Arbitraries.integers().between(1, 6);
        Arbitrary<String> gender = Arbitraries.of("male", "female");
        return Combinators.combine(link, link, link, order, order, gender)
                .as(SideCase::new)
                // Distinct birth orders keep the elder/younger branch determinate so the relation
                // resolves and its side can be asserted.
                .filter(c -> c.egoParentOrder() != c.sibOrder());
    }

    /**
     * Feature: vietnamese-family-tree, Property 11
     *
     * <p>For every generated uncle/aunt branch, the resolved side is {@link Side#PATERNAL} exactly
     * when ego is connected to the branch's lineage by a father link and {@link Side#MATERNAL}
     * exactly when by a mother link, regardless of the gender of the target or the link types
     * higher up the branch. (8.2, 8.3)
     *
     * <p><strong>Validates: Requirements 8.2, 8.3</strong>
     */
    @Property(tries = 200)
    void sideMatchesTheLinkLeavingEgo(@ForAll("sideCases") SideCase c) {
        Map<UUID, Person> people = new HashMap<>();
        List<Relationship> edges = new ArrayList<>();

        // grandparent -> { egoParent, parentSibling }; egoParent -> ego.
        UUID grandparent = person(people, "male", null, null);
        UUID egoParent = person(people, "male", c.egoParentOrder(), 1950);
        UUID parentSibling = person(people, c.targetGender(), c.sibOrder(), 1955);
        UUID ego = person(people, "male", 1, 1980);

        bloodline(edges, grandparent, egoParent, c.gpToParentLink());
        bloodline(edges, grandparent, parentSibling, c.gpToSibLink());
        bloodline(edges, egoParent, ego, c.connectingLink());

        KinshipGraphProjection projection = KinshipGraphProjection.fromEdges(TREE_ID, edges);
        CanonicalResolution result =
                new KinshipResolver().resolveCanonical(projection, ego, parentSibling, people::get);

        // The branch is a determinate parent-generation relative: it must resolve.
        assertThat(result.isResolved()).as("resolved for %s", c).isTrue();
        CanonicalRelation r = result.relation();
        assertThat(r.upCount()).as("two generations up to the grandparent").isEqualTo(2);
        assertThat(r.downCount()).as("one generation down to the parent's sibling").isEqualTo(1);

        // (8.2, 8.3) Paternal iff the link leaving ego is a father link; maternal iff a mother link.
        Side expectedSide =
                c.connectingLink() == ParentType.FATHER ? Side.PATERNAL : Side.MATERNAL;
        assertThat(r.side())
                .as("side from connecting link %s in %s", c.connectingLink(), c)
                .isEqualTo(expectedSide);
    }

    // --- Fixture helpers ----------------------------------------------------------------------

    private static UUID person(
            Map<UUID, Person> people, String gender, Integer birthOrder, Integer birthYear) {
        UUID id = UUID.randomUUID();
        Person p = new Person(TREE_ID, "P", gender);
        p.setBirthOrder(birthOrder);
        p.setBirthYear(birthYear);
        people.put(id, p);
        return id;
    }

    /** Add a bloodline edge {@code parent -> child} of the role given by {@code parentType}. */
    private static void bloodline(
            List<Relationship> edges, UUID parent, UUID child, ParentType parentType) {
        String type =
                parentType == ParentType.FATHER
                        ? RelationshipService.TYPE_BLOODLINE_FATHER
                        : RelationshipService.TYPE_BLOODLINE_MOTHER;
        edges.add(new Relationship(TREE_ID, type, parent, child));
    }
}
