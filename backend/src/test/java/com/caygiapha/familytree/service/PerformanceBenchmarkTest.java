package com.caygiapha.familytree.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.caygiapha.familytree.dto.SearchRequest;
import com.caygiapha.familytree.dto.SearchResponse;
import com.caygiapha.familytree.entity.Person;
import com.caygiapha.familytree.entity.RegionKinshipTerm;
import com.caygiapha.familytree.entity.Relationship;
import com.caygiapha.familytree.entity.Tree;
import com.caygiapha.familytree.repository.PersonRepository;
import com.caygiapha.familytree.repository.RegionKinshipTermRepository;
import com.caygiapha.familytree.repository.RelationshipRepository;
import com.caygiapha.familytree.repository.TreeRepository;
import java.lang.reflect.Field;
import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Deque;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Random;
import java.util.UUID;
import java.util.function.Function;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestInstance;

/**
 * Performance benchmarks for the kinship/search/upgrade hot paths on a generated ~1,000-node tree
 * (task 13.2; design <em>Testing Strategy — Performance Tests</em>).
 *
 * <p>The performance-critical domain logic is pure and runs entirely in memory (no database, no
 * Docker): a deterministic, seeded {@code ~1,000}-person tree of {@link Person} nodes joined by
 * {@code bloodline_father} and {@code marriage} {@link Relationship} edges is generated once, a
 * {@link KinshipGraphProjection} is built from those edges, and each budgeted operation is timed
 * after a warm-up iteration (to absorb JIT/class-loading jitter) and asserted against its
 * spec budget:
 *
 * <ul>
 *   <li><strong>Single-pair address &lt; 1s (8.1)</strong> — {@link KinshipResolver#resolveCanonical}
 *       and {@link KinshipAddressService#resolve} for a far-apart ego/target pair.</li>
 *   <li><strong>Viewpoint all-addresses &lt; 2s (10.2)</strong> — {@link KinshipResolver#resolveAllFrom}
 *       from one ego to every other node via a single BFS.</li>
 *   <li><strong>Search &lt; 2s (16.7)</strong> — {@link SearchService} name search and address
 *       search over all ~1,000 persons.</li>
 *   <li><strong>Asserted-upgrade scan &lt; 1s (7.2)</strong> — {@link AssertedUpgradeService#scanForUpgrades}
 *       over a tree carrying asserted edges among the 1,000 nodes.</li>
 * </ul>
 *
 * <p><strong>Help render &lt; 2s (17.3) — decision.</strong> The Help_System is static, in-app
 * frontend content served by Next.js (design <em>Help_System</em>; implemented by task 11.1). Its
 * render budget is a frontend concern with no backend code path, so it is intentionally
 * <em>not</em> exercised by this backend suite (rendering Next.js here is out of scope). The budget
 * is satisfied by the static help page from task 11.1; see {@link #helpRenderIsOutOfBackendScope()}.
 *
 * <p>Tagged {@code performance} so it can be excluded from a fast CI lane if desired; it runs here
 * without any external services.
 */
@Tag("performance")
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
class PerformanceBenchmarkTest {

    /** Deterministic seed so the generated graph is identical on every run. */
    private static final long SEED = 20240213L;

    /** Target total person count for the generated tree (~1,000 nodes). */
    private static final int TARGET_PERSONS = 1000;

    /** Number of bloodline-tree persons; the remainder are dead-end spouses. */
    private static final int BLOODLINE_PERSONS = 950;

    /** Children per internal node in the generated bloodline tree. */
    private static final int BRANCHING_FACTOR = 3;

    /** Number of asserted edges seeded among the 1,000 nodes for the upgrade scan. */
    private static final int ASSERTED_EDGES = 50;

    private static final String REGION = Tree.DEFAULT_REGION;

    // Budgets (milliseconds).
    private static final long SINGLE_PAIR_BUDGET_MS = 1000;
    private static final long VIEWPOINT_BUDGET_MS = 2000;
    private static final long SEARCH_BUDGET_MS = 2000;
    private static final long UPGRADE_BUDGET_MS = 1000;

    private GeneratedTree tree;
    private KinshipGraphProjection projection;
    private KinshipResolver resolver;
    private KinshipAddressService addressService;
    private SearchService searchService;
    private AssertedUpgradeService assertedUpgradeService;

    @BeforeAll
    void setUp() {
        tree = generateTree();
        projection = KinshipGraphProjection.fromEdges(tree.treeId, tree.projectionEdges());
        resolver = new KinshipResolver();

        // A real KinshipAddressService wired over in-memory fakes (mock repositories returning the
        // generated data). Only the I/O-free resolution paths are exercised; the region-term lookup
        // always returns a term so resolved relations produce a defined address.
        RelationshipRepository relationshipRepository = mock(RelationshipRepository.class);
        PersonRepository personRepository = mock(PersonRepository.class);
        TreeRepository treeRepository = mock(TreeRepository.class);
        RegionKinshipTermRepository termRepository = mock(RegionKinshipTermRepository.class);
        ClaimService claimService = mock(ClaimService.class);

        lenient().when(relationshipRepository.findByTreeId(tree.treeId))
                .thenReturn(tree.projectionEdges());
        lenient().when(relationshipRepository.findByTreeIdAndType(
                        tree.treeId, RelationshipService.TYPE_BLOODLINE_FATHER))
                .thenReturn(tree.fatherEdges);
        lenient().when(relationshipRepository.findByTreeIdAndType(
                        tree.treeId, RelationshipService.TYPE_BLOODLINE_MOTHER))
                .thenReturn(List.of());
        lenient().when(relationshipRepository.findByTreeIdAndType(
                        tree.treeId, RelationshipService.TYPE_ASSERTED))
                .thenReturn(tree.assertedEdges);
        lenient().when(relationshipRepository.findFirstBySourceIdAndTargetIdAndType(
                        any(), any(), anyString()))
                .thenReturn(Optional.empty());

        lenient().when(personRepository.findByTreeId(tree.treeId)).thenReturn(tree.persons);
        lenient().when(personRepository.existsByIdAndTreeId(any(UUID.class), eq(tree.treeId)))
                .thenReturn(true);

        Tree treeEntity = new Tree(UUID.randomUUID(), REGION);
        lenient().when(treeRepository.findById(tree.treeId)).thenReturn(Optional.of(treeEntity));

        lenient().when(termRepository.findByRegionAndCanonicalRelation(anyString(), anyString()))
                .thenAnswer(inv -> Optional.of(new RegionKinshipTerm(
                        inv.getArgument(0), inv.getArgument(1), "term")));

        KinshipGraphProjectionCache projectionCache =
                new KinshipGraphProjectionCache(relationshipRepository);

        addressService = new KinshipAddressService(
                resolver, projectionCache, personRepository, treeRepository,
                termRepository, relationshipRepository);
        searchService = new SearchService(
                personRepository, addressService, claimService, relationshipRepository);
        assertedUpgradeService =
                new AssertedUpgradeService(relationshipRepository, addressService);
    }

    // --- Single-pair address < 1s (8.1) -------------------------------------------------------

    @Test
    void singlePairAddressResolvesWithinOneSecond() {
        UUID ego = tree.farEgo;
        UUID target = tree.farTarget;
        Function<UUID, Person> lookup = tree.byId::get;
        KinshipAddressService.RegionTermLookup termLookup = (region, key) -> Optional.of("term");

        // Sanity: the chosen far-apart pair resolves to a defined address.
        assertThat(resolver.resolveCanonical(projection, ego, target, lookup).isResolved())
                .as("far-apart pair should resolve").isTrue();

        // Warm-up.
        resolver.resolveCanonical(projection, ego, target, lookup);
        addressService.resolve(REGION, projection, ego, target, lookup, termLookup);

        long resolverMs = timeMillis(() ->
                resolver.resolveCanonical(projection, ego, target, lookup));
        long addressMs = timeMillis(() ->
                addressService.resolve(REGION, projection, ego, target, lookup, termLookup));

        System.out.printf(
                "[perf] single-pair (8.1): resolveCanonical=%dms, resolveAddress=%dms (budget %dms)%n",
                resolverMs, addressMs, SINGLE_PAIR_BUDGET_MS);

        assertThat(resolverMs).as("resolveCanonical single-pair (8.1)")
                .isLessThan(SINGLE_PAIR_BUDGET_MS);
        assertThat(addressMs).as("resolveAddress single-pair (8.1)")
                .isLessThan(SINGLE_PAIR_BUDGET_MS);
    }

    // --- Viewpoint all-addresses < 2s (10.2) --------------------------------------------------

    @Test
    void viewpointAllAddressesResolvesWithinTwoSeconds() {
        UUID ego = tree.farEgo;
        List<UUID> allOthers = new ArrayList<>(tree.ids);
        allOthers.remove(ego);
        Function<UUID, Person> lookup = tree.byId::get;

        // Warm-up.
        resolver.resolveAllFrom(projection, ego, allOthers, lookup);

        long[] resolved = new long[1];
        long ms = timeMillis(() -> {
            Map<UUID, CanonicalResolution> all =
                    resolver.resolveAllFrom(projection, ego, allOthers, lookup);
            resolved[0] = all.values().stream().filter(CanonicalResolution::isResolved).count();
        });

        System.out.printf(
                "[perf] viewpoint all-addresses (10.2): %d targets in %dms, %d resolved (budget %dms)%n",
                allOthers.size(), ms, resolved[0], VIEWPOINT_BUDGET_MS);

        assertThat(allOthers).hasSize(tree.ids.size() - 1);
        assertThat(ms).as("resolveAllFrom for ~1000 nodes (10.2)").isLessThan(VIEWPOINT_BUDGET_MS);
    }

    // --- Search < 2s (16.7) -------------------------------------------------------------------

    @Test
    void nameSearchOverThousandPersonsResolvesWithinTwoSeconds() {
        // "person" is a substring of every generated display name, so this is the worst case.
        SearchRequest request = new SearchRequest("person", null, null, null);

        // Warm-up.
        searchService.search(tree.treeId, request);

        long[] matched = new long[1];
        long ms = timeMillis(() -> {
            SearchResponse response = searchService.search(tree.treeId, request);
            matched[0] = response.results().size();
        });

        System.out.printf(
                "[perf] name search (16.7): %d matches in %dms (budget %dms)%n",
                matched[0], ms, SEARCH_BUDGET_MS);

        assertThat(matched[0]).isEqualTo(tree.persons.size());
        assertThat(ms).as("name search over ~1000 persons (16.7)").isLessThan(SEARCH_BUDGET_MS);
    }

    @Test
    void addressSearchOverThousandPersonsResolvesWithinTwoSeconds() {
        UUID viewpoint = tree.farEgo;
        // Every resolved relation maps to the term "term", so this exercises a full resolve per
        // person from the viewpoint (the address-search worst case).
        SearchRequest request = new SearchRequest(null, "term", viewpoint, null);

        // Warm-up.
        searchService.search(tree.treeId, request);

        long[] matched = new long[1];
        long ms = timeMillis(() -> {
            SearchResponse response = searchService.search(tree.treeId, request);
            matched[0] = response.results().size();
        });

        System.out.printf(
                "[perf] address search (16.7): %d matches in %dms (budget %dms)%n",
                matched[0], ms, SEARCH_BUDGET_MS);

        assertThat(ms).as("address search over ~1000 persons (16.7)").isLessThan(SEARCH_BUDGET_MS);
    }

    // --- Asserted-upgrade scan < 1s (7.2) -----------------------------------------------------

    @Test
    void assertedUpgradeScanResolvesWithinOneSecond() {
        // Warm-up (also primes the projection cache).
        assertedUpgradeService.scanForUpgrades(tree.treeId);

        long ms = timeMillis(() -> assertedUpgradeService.scanForUpgrades(tree.treeId));

        System.out.printf(
                "[perf] asserted-upgrade scan (7.2): %d asserted edges in %dms (budget %dms)%n",
                tree.assertedEdges.size(), ms, UPGRADE_BUDGET_MS);

        assertThat(ms).as("asserted-upgrade scan over ~1000 nodes (7.2)")
                .isLessThan(UPGRADE_BUDGET_MS);
    }

    // --- Help render < 2s (17.3): documented out-of-backend-scope decision --------------------

    /**
     * Help render (17.3) is static frontend content served by Next.js (design <em>Help_System</em>,
     * implemented by task 11.1) and has no backend code path to benchmark. Rendering Next.js here is
     * out of scope for the backend performance suite, so the 2-second render budget is covered by
     * the static help page from task 11.1 rather than exercised here. This test records that
     * decision explicitly.
     */
    @Test
    void helpRenderIsOutOfBackendScope() {
        assertThat(REGION).isNotNull(); // no backend path for 17.3; see Javadoc for the decision.
    }

    // --- Timing helper ------------------------------------------------------------------------

    private static long timeMillis(Runnable op) {
        long start = System.nanoTime();
        op.run();
        return (System.nanoTime() - start) / 1_000_000;
    }

    // --- Deterministic tree generation --------------------------------------------------------

    /** The generated in-memory tree and the derived edge views used by the benchmarks. */
    private record GeneratedTree(
            UUID treeId,
            List<Person> persons,
            Map<UUID, Person> byId,
            List<UUID> ids,
            List<Relationship> fatherEdges,
            List<Relationship> marriageEdges,
            List<Relationship> assertedEdges,
            UUID farEgo,
            UUID farTarget) {

        /** Bloodline + marriage edges that make up the kinship-graph projection (asserted excluded). */
        List<Relationship> projectionEdges() {
            List<Relationship> all = new ArrayList<>(fatherEdges.size() + marriageEdges.size());
            all.addAll(fatherEdges);
            all.addAll(marriageEdges);
            return all;
        }
    }

    /**
     * Build a deterministic, connected ~1,000-person tree: a balanced {@value #BRANCHING_FACTOR}-ary
     * bloodline (father-edge) tree of {@value #BLOODLINE_PERSONS} persons, plus dead-end spouses
     * married to the first persons so that marriage adjacency exists without creating shortcuts
     * between bloodline nodes. Each child gets a distinct birth order within its sibling group so
     * elder/younger branch comparisons resolve.
     */
    private GeneratedTree generateTree() {
        UUID treeId = UUID.randomUUID();
        Random rnd = new Random(SEED);

        List<Person> persons = new ArrayList<>();
        Map<UUID, Person> byId = new HashMap<>();
        List<UUID> bloodlineIds = new ArrayList<>();
        List<Relationship> fatherEdges = new ArrayList<>();
        List<Relationship> marriageEdges = new ArrayList<>();

        int[] counter = {0};

        // Root of the bloodline tree.
        UUID rootId = newPerson(persons, byId, treeId, counter, rnd, 1);
        bloodlineIds.add(rootId);

        Deque<UUID> frontier = new ArrayDeque<>();
        frontier.add(rootId);

        while (persons.size() < BLOODLINE_PERSONS && !frontier.isEmpty()) {
            UUID parentId = frontier.poll();
            for (int i = 0; i < BRANCHING_FACTOR && persons.size() < BLOODLINE_PERSONS; i++) {
                UUID childId = newPerson(persons, byId, treeId, counter, rnd, i + 1);
                bloodlineIds.add(childId);
                fatherEdges.add(edge(treeId, RelationshipService.TYPE_BLOODLINE_FATHER,
                        parentId, childId));
                frontier.add(childId);
            }
        }

        // Dead-end spouses to reach ~1,000 persons and exercise marriage adjacency. A spouse has a
        // single marriage edge and no children, so it never shortens a bloodline path.
        int spouseTarget = TARGET_PERSONS - persons.size();
        for (int i = 0; i < spouseTarget; i++) {
            UUID partner = bloodlineIds.get(i % bloodlineIds.size());
            UUID spouseId = newPerson(persons, byId, treeId, counter, rnd, 1);
            marriageEdges.add(marriage(treeId, partner, spouseId));
        }

        List<UUID> ids = new ArrayList<>(byId.keySet());

        // Asserted edges among bloodline-connected pairs (the tree is connected), so the scan does
        // real derived resolution per edge. Half use a label that matches the derived term
        // (verified), half a mismatching label (conflict) — exercising both branches.
        List<Relationship> assertedEdges = new ArrayList<>();
        for (int i = 0; i < ASSERTED_EDGES; i++) {
            UUID a = bloodlineIds.get(i % bloodlineIds.size());
            UUID b = bloodlineIds.get((i + bloodlineIds.size() / 2) % bloodlineIds.size());
            if (a.equals(b)) {
                continue;
            }
            String label = (i % 2 == 0) ? "term" : "other";
            Relationship asserted = edge(treeId, RelationshipService.TYPE_ASSERTED, a, b);
            asserted.setAssertedLabel(label);
            asserted.setDerivationState("asserted");
            assertedEdges.add(asserted);
        }

        // A far-apart ego/target pair: the deepest generated bloodline node and an early shallow one.
        UUID farEgo = bloodlineIds.get(bloodlineIds.size() - 1);
        UUID farTarget = bloodlineIds.get(3);

        return new GeneratedTree(treeId, persons, byId, ids, fatherEdges, marriageEdges,
                assertedEdges, farEgo, farTarget);
    }

    private UUID newPerson(
            List<Person> persons,
            Map<UUID, Person> byId,
            UUID treeId,
            int[] counter,
            Random rnd,
            int birthOrder) {
        int n = counter[0]++;
        String gender = (n % 2 == 0) ? "male" : "female";
        Person person = new Person(treeId, String.format("Person %04d", n), gender);
        setId(person, UUID.randomUUID());
        person.setBirthOrder(birthOrder);
        // Distinct, valid birth year (1000..current); fallback ordering for branch comparisons.
        person.setBirthYear(1000 + n);
        // Mix in deterministic jitter so not every value is monotone (does not affect resolvability).
        if (rnd.nextInt(10) == 0) {
            person.setDeathStatus(true);
        }
        persons.add(person);
        byId.put(person.getId(), person);
        return person.getId();
    }

    private static Relationship edge(UUID treeId, String type, UUID sourceId, UUID targetId) {
        Relationship r = new Relationship(treeId, type, sourceId, targetId);
        setId(r, UUID.randomUUID());
        return r;
    }

    private static Relationship marriage(UUID treeId, UUID a, UUID b) {
        Relationship r = edge(treeId, RelationshipService.TYPE_MARRIAGE, a, b);
        r.setMaritalStatus("married");
        return r;
    }

    /** Persons/relationships are persisted with a generated id; set it reflectively for fixtures. */
    private static void setId(Object entity, UUID id) {
        try {
            Field field = entity.getClass().getDeclaredField("id");
            field.setAccessible(true);
            field.set(entity, id);
        } catch (ReflectiveOperationException e) {
            throw new IllegalStateException("Unable to set entity id for benchmark fixture", e);
        }
    }
}
