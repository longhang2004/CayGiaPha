package com.caygiapha.familytree.service;

import static org.assertj.core.api.Assertions.assertThat;

import com.caygiapha.familytree.entity.Person;
import com.caygiapha.familytree.entity.Relationship;
import com.caygiapha.familytree.service.CanonicalRelation.BranchOrder;
import com.caygiapha.familytree.service.CanonicalRelation.Side;
import com.caygiapha.familytree.service.CanonicalResolution.Status;
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
 * Property-based tests for the resolver's elder/younger (birth-order) selection at a sibling
 * branch point (design: <em>Kinship_Resolver Algorithm — Step 3, Elder/younger</em>).
 *
 * <p>Feature: vietnamese-family-tree, Property 12
 *
 * <p><strong>Property 12: Elder/younger selection</strong> — for a sibling pair at a branch point,
 * the resolver selects the elder-sibling term ({@link BranchOrder#ELDER}) when the relative's
 * connecting ancestor was born before ego's connecting parent and the younger-sibling term
 * ({@link BranchOrder#YOUNGER}) when born after, comparing by birth order first and falling back to
 * birth year; when both birth order and birth year are absent or equal for the pair, the resolver
 * returns the indeterminate-order unresolved indicator and selects neither term. (8.4, 8.5)
 *
 * <p>The fixture is the minimal branch that exercises the distinction: a grandparent with two
 * children — ego's parent and the parent's sibling (the relative's connecting ancestor) — and ego
 * as a child of ego's parent. Resolving {@code ego -> parentSibling} yields {@code upCount = 2},
 * {@code downCount = 1}, so the resolver must compare {@code parentSibling} against {@code egoParent}
 * exactly as the property describes.
 *
 * <p>The expected outcome is recomputed by an <em>independent oracle</em> derived straight from the
 * acceptance criteria (order-then-year, else indeterminate), not from the production code path.
 *
 * <p><strong>Validates: Requirements 8.4, 8.5</strong>
 */
class ElderYoungerSelectionProperties {

    private static final UUID TREE_ID = new UUID(12L, 12L);

    /** The birth-order / birth-year data of ego's parent and the parent's sibling for one case. */
    private record BranchData(
            Integer parentOrder, Integer parentYear, Integer sibOrder, Integer sibYear) {}

    /** The three mutually exclusive expected outcomes of the elder/younger distinction. */
    private enum Expected {
        ELDER,
        YOUNGER,
        INDETERMINATE
    }

    @Provide
    Arbitrary<BranchData> branchData() {
        // Deliberately small ranges with injected nulls so that, across 200+ cases, all three
        // outcomes occur frequently: differing orders, equal/absent orders with differing years,
        // and the both-absent/both-equal indeterminate case.
        Arbitrary<Integer> order = Arbitraries.integers().between(1, 5).injectNull(0.3);
        Arbitrary<Integer> year = Arbitraries.integers().between(1900, 1905).injectNull(0.3);
        return Combinators.combine(order, year, order, year).as(BranchData::new);
    }

    /**
     * Independent oracle straight from Requirements 8.4/8.5: compare the relative's connecting
     * ancestor (the sibling) against ego's connecting parent by birth order, then birth year; if
     * both are absent or equal the distinction is indeterminate.
     */
    private static Expected oracle(BranchData d) {
        if (d.sibOrder() != null && d.parentOrder() != null && !d.sibOrder().equals(d.parentOrder())) {
            return d.sibOrder() < d.parentOrder() ? Expected.ELDER : Expected.YOUNGER;
        }
        if (d.sibYear() != null && d.parentYear() != null && !d.sibYear().equals(d.parentYear())) {
            return d.sibYear() < d.parentYear() ? Expected.ELDER : Expected.YOUNGER;
        }
        return Expected.INDETERMINATE;
    }

    /**
     * Feature: vietnamese-family-tree, Property 12
     *
     * <p>For every generated birth-order/birth-year combination of ego's parent and the parent's
     * sibling, the resolved {@code branchOrder} equals the elder/younger outcome the acceptance
     * criteria prescribe, or — when neither order nor year distinguishes the pair — the resolution
     * is exactly the indeterminate-order unresolved status with no relation. (8.4, 8.5)
     *
     * <p><strong>Validates: Requirements 8.4, 8.5</strong>
     */
    @Property(tries = 200)
    void elderYoungerMatchesBirthOrderThenYearOracle(@ForAll("branchData") BranchData d) {
        Map<UUID, Person> people = new HashMap<>();
        List<Relationship> edges = new ArrayList<>();

        // grandparent -> { egoParent, parentSibling }; egoParent -> ego.
        UUID grandparent = person(people, "male", null, null);
        UUID egoParent = person(people, "male", d.parentOrder(), d.parentYear());
        UUID parentSibling = person(people, "male", d.sibOrder(), d.sibYear());
        UUID ego = person(people, "male", 1, 1990);

        father(edges, grandparent, egoParent);
        father(edges, grandparent, parentSibling);
        father(edges, egoParent, ego);

        KinshipGraphProjection projection = KinshipGraphProjection.fromEdges(TREE_ID, edges);
        CanonicalResolution result =
                new KinshipResolver().resolveCanonical(projection, ego, parentSibling, people::get);

        Expected expected = oracle(d);

        if (expected == Expected.INDETERMINATE) {
            // (8.5) Neither elder nor younger may be selected; the result is the explicit
            // indeterminate-order unresolved indicator carrying no relation.
            assertThat(result.status())
                    .as("indeterminate order for %s", d)
                    .isEqualTo(Status.UNRESOLVED_INDETERMINATE_ORDER);
            assertThat(result.canonicalRelation()).isEmpty();
        } else {
            // (8.4) A definite elder/younger distinction must resolve to the matching branch order
            // on a paternal uncle/aunt branch (upCount = 2, downCount = 1).
            assertThat(result.isResolved()).as("resolved for %s", d).isTrue();
            CanonicalRelation r = result.relation();
            assertThat(r.upCount()).isEqualTo(2);
            assertThat(r.downCount()).isEqualTo(1);
            assertThat(r.side()).isEqualTo(Side.PATERNAL);
            BranchOrder expectedOrder =
                    expected == Expected.ELDER ? BranchOrder.ELDER : BranchOrder.YOUNGER;
            assertThat(r.branchOrder()).as("branch order for %s", d).isEqualTo(expectedOrder);
        }
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

    private static void father(List<Relationship> edges, UUID parent, UUID childId) {
        edges.add(
                new Relationship(
                        TREE_ID, RelationshipService.TYPE_BLOODLINE_FATHER, parent, childId));
    }
}
