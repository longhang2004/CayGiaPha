package com.caygiapha.familytree.service;

import static org.assertj.core.api.Assertions.assertThat;

import com.caygiapha.familytree.entity.Person;
import com.caygiapha.familytree.entity.Relationship;
import com.caygiapha.familytree.service.CanonicalRelation.BranchOrder;
import com.caygiapha.familytree.service.CanonicalRelation.Gender;
import com.caygiapha.familytree.service.CanonicalRelation.Side;
import com.caygiapha.familytree.service.CanonicalResolution.Status;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;

/**
 * Unit tests for {@link KinshipResolver} covering representative kinship relations (design:
 * <em>Kinship_Resolver Algorithm — Steps 2 &amp; 3</em>).
 *
 * <p>Each test builds a small in-memory family, projects it with {@link KinshipGraphProjection},
 * and resolves the canonical descriptor an ego uses to address a target. Persons are looked up by
 * id through an in-memory map; the resolver only reads gender / birth order / birth year, so the
 * (unset, JPA-generated) {@link Person#getId()} is irrelevant.
 *
 * <p>Covers: parent, grandparent, paternal uncle (elder = bác, younger = chú), maternal uncle
 * (cậu), sibling (elder/younger), spouse-of-relative, bare spouse, descendant, no-path unresolved,
 * and unknown-birth-order unresolved. (Requirements 5.4, 8.1, 8.2, 8.3, 8.4, 8.5, 8.7)
 */
class KinshipResolverTest {

    private static final UUID TREE_ID = UUID.randomUUID();

    private final KinshipResolver resolver = new KinshipResolver();

    // --- Family fixture -----------------------------------------------------------------------

    private final Map<UUID, Person> people = new HashMap<>();
    private final List<Relationship> edges = new ArrayList<>();

    // Paternal line.
    private final UUID gf = person("male", 1, 1940);          // grandfather
    private final UUID father = person("male", 2, 1970);      // ego's father
    private final UUID uncleElder = person("male", 1, 1965);  // father's elder brother -> bác
    private final UUID uncleYounger = person("male", 3, 1975); // father's younger brother -> chú
    private final UUID uncleUnknown = person("male", null, null); // no birth data -> UNKNOWN
    private final UUID auntInLaw = person("female", null, 1966); // uncleElder's wife

    // Maternal line.
    private final UUID mgf = person("male", 1, 1942);         // maternal grandfather
    private final UUID mother = person("female", 2, 1972);    // ego's mother
    private final UUID maternalUncle = person("male", 1, 1968); // mother's elder brother -> cậu

    // Ego's generation and descendants.
    private final UUID ego = person("male", 2, 1995);
    private final UUID siblingElder = person("female", 1, 1992); // -> chị
    private final UUID siblingYounger = person("male", 3, 1998); // -> em
    private final UUID child = person("female", 1, 2020);

    // A disconnected couple (separate component) for the no-path case.
    private final UUID stranger1 = person("male", 1, 1990);
    private final UUID stranger2 = person("female", 1, 1991);

    KinshipResolverTest() {
        // Paternal grandfather -> his children.
        father(gf, father);
        father(gf, uncleElder);
        father(gf, uncleYounger);
        father(gf, uncleUnknown);

        // Ego's parents -> ego (father link + mother link) and paternal half-siblings via father.
        father(father, ego);
        mother(mother, ego);
        father(father, siblingElder);
        father(father, siblingYounger);

        // Maternal grandfather -> mother and maternal uncle.
        father(mgf, mother);
        father(mgf, maternalUncle);

        // Ego -> child.
        father(ego, child);

        // Marriages.
        marriage(father, mother);
        marriage(uncleElder, auntInLaw);

        // Disconnected component.
        marriage(stranger1, stranger2);
    }

    private KinshipResolution resolve(UUID from, UUID to) {
        KinshipGraphProjection projection = KinshipGraphProjection.fromEdges(TREE_ID, edges);
        return new KinshipResolution(resolver.resolveCanonical(projection, from, to, people::get));
    }

    // --- Tests --------------------------------------------------------------------------------

    @Test
    void parentIsOneUpPaternalSelfOrder() {
        CanonicalRelation r = resolve(ego, father).relation();
        assertThat(r.upCount()).isEqualTo(1);
        assertThat(r.downCount()).isEqualTo(0);
        assertThat(r.side()).isEqualTo(Side.PATERNAL);
        assertThat(r.targetGender()).isEqualTo(Gender.MALE);
        assertThat(r.branchOrder()).isEqualTo(BranchOrder.SELF);
        assertThat(r.spouseHop()).isFalse();
    }

    @Test
    void grandparentIsTwoUpPaternal() {
        CanonicalRelation r = resolve(ego, gf).relation();
        assertThat(r.upCount()).isEqualTo(2);
        assertThat(r.downCount()).isEqualTo(0);
        assertThat(r.side()).isEqualTo(Side.PATERNAL);
        assertThat(r.branchOrder()).isEqualTo(BranchOrder.SELF);
    }

    @Test
    void paternalElderUncleIsElderPaternalBranch() {
        CanonicalRelation r = resolve(ego, uncleElder).relation();
        assertThat(r.upCount()).isEqualTo(2);
        assertThat(r.downCount()).isEqualTo(1);
        assertThat(r.side()).isEqualTo(Side.PATERNAL);
        assertThat(r.targetGender()).isEqualTo(Gender.MALE);
        assertThat(r.branchOrder()).isEqualTo(BranchOrder.ELDER); // bác
        assertThat(r.spouseHop()).isFalse();
    }

    @Test
    void paternalYoungerUncleIsYoungerPaternalBranch() {
        CanonicalRelation r = resolve(ego, uncleYounger).relation();
        assertThat(r.upCount()).isEqualTo(2);
        assertThat(r.downCount()).isEqualTo(1);
        assertThat(r.side()).isEqualTo(Side.PATERNAL);
        assertThat(r.branchOrder()).isEqualTo(BranchOrder.YOUNGER); // chú
    }

    @Test
    void maternalUncleIsMaternalBranch() {
        CanonicalRelation r = resolve(ego, maternalUncle).relation();
        assertThat(r.upCount()).isEqualTo(2);
        assertThat(r.downCount()).isEqualTo(1);
        assertThat(r.side()).isEqualTo(Side.MATERNAL); // cậu
        assertThat(r.targetGender()).isEqualTo(Gender.MALE);
        assertThat(r.branchOrder()).isEqualTo(BranchOrder.ELDER);
    }

    @Test
    void elderSiblingIsOneUpOneDownElder() {
        CanonicalRelation r = resolve(ego, siblingElder).relation();
        assertThat(r.upCount()).isEqualTo(1);
        assertThat(r.downCount()).isEqualTo(1);
        assertThat(r.side()).isEqualTo(Side.PATERNAL);
        assertThat(r.targetGender()).isEqualTo(Gender.FEMALE);
        assertThat(r.branchOrder()).isEqualTo(BranchOrder.ELDER); // chị
        assertThat(r.spouseHop()).isFalse();
    }

    @Test
    void youngerSiblingIsYounger() {
        CanonicalRelation r = resolve(ego, siblingYounger).relation();
        assertThat(r.upCount()).isEqualTo(1);
        assertThat(r.downCount()).isEqualTo(1);
        assertThat(r.branchOrder()).isEqualTo(BranchOrder.YOUNGER); // em
    }

    @Test
    void spouseOfRelativeSetsSpouseHopAndTargetGender() {
        CanonicalRelation r = resolve(ego, auntInLaw).relation();
        assertThat(r.upCount()).isEqualTo(2);
        assertThat(r.downCount()).isEqualTo(1);
        assertThat(r.side()).isEqualTo(Side.PATERNAL);
        assertThat(r.targetGender()).isEqualTo(Gender.FEMALE);
        assertThat(r.branchOrder()).isEqualTo(BranchOrder.ELDER); // wife of bác
        assertThat(r.spouseHop()).isTrue();
    }

    @Test
    void bareSpouseIsSelfSidesWithSpouseHop() {
        // From the father, the mother is reached by a single marriage edge.
        CanonicalRelation r = resolve(father, mother).relation();
        assertThat(r.upCount()).isEqualTo(0);
        assertThat(r.downCount()).isEqualTo(0);
        assertThat(r.side()).isEqualTo(Side.SELF);
        assertThat(r.targetGender()).isEqualTo(Gender.FEMALE);
        assertThat(r.branchOrder()).isEqualTo(BranchOrder.SELF);
        assertThat(r.spouseHop()).isTrue();
    }

    @Test
    void descendantIsDownSelf() {
        CanonicalRelation r = resolve(ego, child).relation();
        assertThat(r.upCount()).isEqualTo(0);
        assertThat(r.downCount()).isEqualTo(1);
        assertThat(r.side()).isEqualTo(Side.SELF);
        assertThat(r.targetGender()).isEqualTo(Gender.FEMALE);
        assertThat(r.branchOrder()).isEqualTo(BranchOrder.SELF);
    }

    @Test
    void egoAddressingItselfIsSelf() {
        CanonicalRelation r = resolve(ego, ego).relation();
        assertThat(r.upCount()).isEqualTo(0);
        assertThat(r.downCount()).isEqualTo(0);
        assertThat(r.side()).isEqualTo(Side.SELF);
        assertThat(r.branchOrder()).isEqualTo(BranchOrder.SELF);
    }

    @Test
    void noPathBetweenDisconnectedComponentsIsUnresolved() {
        CanonicalResolution result = resolve(ego, stranger1).result();
        assertThat(result.status()).isEqualTo(Status.UNRESOLVED_NO_PATH);
        assertThat(result.isResolved()).isFalse();
        assertThat(result.canonicalRelation()).isEmpty();
    }

    @Test
    void unknownBirthOrderAtBranchIsIndeterminate() {
        CanonicalResolution result = resolve(ego, uncleUnknown).result();
        assertThat(result.status()).isEqualTo(Status.UNRESOLVED_INDETERMINATE_ORDER);
        assertThat(result.isUnresolved()).isTrue();
        assertThat(result.canonicalRelation()).isEmpty();
    }

    @Test
    void canonicalKeyIsStableAndDistinguishesElderFromYounger() {
        CanonicalRelation bac = resolve(ego, uncleElder).relation();
        CanonicalRelation chu = resolve(ego, uncleYounger).relation();
        assertThat(bac.canonicalKey()).isNotEqualTo(chu.canonicalKey());
        assertThat(bac.canonicalKey()).isEqualTo("u2:d1:PATERNAL:MALE:ELDER:s0");
    }

    @Test
    void resolveAllFromMatchesPerTargetResolveForEveryNode() {
        // The single-BFS all-targets method (task 3.12) must agree with N independent resolves.
        KinshipGraphProjection projection = KinshipGraphProjection.fromEdges(TREE_ID, edges);
        List<UUID> targets = new ArrayList<>(people.keySet());

        Map<UUID, CanonicalResolution> all =
                resolver.resolveAllFrom(projection, ego, targets, people::get);

        assertThat(all.keySet()).containsExactlyInAnyOrderElementsOf(targets);
        for (UUID target : targets) {
            CanonicalResolution single =
                    resolver.resolveCanonical(projection, ego, target, people::get);
            CanonicalResolution batch = all.get(target);
            assertThat(batch.status())
                    .as("status for target %s", target)
                    .isEqualTo(single.status());
            assertThat(batch.canonicalRelation())
                    .as("relation for target %s", target)
                    .isEqualTo(single.canonicalRelation());
        }
    }

    @Test
    void resolveAllFromReportsUnreachableTargetsAsNoPath() {
        KinshipGraphProjection projection = KinshipGraphProjection.fromEdges(TREE_ID, edges);

        Map<UUID, CanonicalResolution> all =
                resolver.resolveAllFrom(projection, ego, List.of(stranger1, child), people::get);

        assertThat(all.get(stranger1).status()).isEqualTo(Status.UNRESOLVED_NO_PATH);
        assertThat(all.get(child).isResolved()).isTrue();
    }

    // --- Fixture helpers ----------------------------------------------------------------------

    private UUID person(String gender, Integer birthOrder, Integer birthYear) {
        UUID id = UUID.randomUUID();
        Person p = new Person(TREE_ID, "P", gender);
        p.setBirthOrder(birthOrder);
        p.setBirthYear(birthYear);
        people.put(id, p);
        return id;
    }

    private void father(UUID parent, UUID childId) {
        edges.add(new Relationship(TREE_ID, RelationshipService.TYPE_BLOODLINE_FATHER, parent, childId));
    }

    private void mother(UUID parent, UUID childId) {
        edges.add(new Relationship(TREE_ID, RelationshipService.TYPE_BLOODLINE_MOTHER, parent, childId));
    }

    private void marriage(UUID a, UUID b) {
        Relationship r = new Relationship(TREE_ID, RelationshipService.TYPE_MARRIAGE, a, b);
        r.setMaritalStatus("married");
        edges.add(r);
    }

    /** Small wrapper exposing both the raw result and the (asserted-present) relation. */
    private record KinshipResolution(CanonicalResolution result) {
        CanonicalRelation relation() {
            assertThat(result.isResolved())
                    .as("expected a resolved relation but was %s", result.status())
                    .isTrue();
            return result.relation();
        }
    }
}
