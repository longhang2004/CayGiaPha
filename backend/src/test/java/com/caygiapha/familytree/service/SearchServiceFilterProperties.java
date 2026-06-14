package com.caygiapha.familytree.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.caygiapha.familytree.dto.SearchFilters;
import com.caygiapha.familytree.dto.SearchRequest;
import com.caygiapha.familytree.dto.SearchResponse;
import com.caygiapha.familytree.dto.SearchResponse.SearchResult;
import com.caygiapha.familytree.entity.Person;
import com.caygiapha.familytree.entity.Relationship;
import com.caygiapha.familytree.repository.PersonRepository;
import com.caygiapha.familytree.repository.RelationshipRepository;
import java.lang.reflect.Field;
import java.util.ArrayList;
import java.util.EnumSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import net.jqwik.api.Arbitraries;
import net.jqwik.api.Arbitrary;
import net.jqwik.api.Assume;
import net.jqwik.api.Combinators;
import net.jqwik.api.ForAll;
import net.jqwik.api.Property;
import net.jqwik.api.Provide;
import net.jqwik.api.constraints.Size;

/**
 * Property-based tests for {@link SearchService} field-filter combination semantics.
 *
 * <p>Feature: vietnamese-family-tree, Property 25 — <em>Filter combination is intersection and
 * monotone</em>. For any set of applied filters the result equals the intersection of the
 * per-filter result sets, and is therefore a subset of the result returned when any one filter is
 * removed (Requirements 16.4, 16.5).
 *
 * <p>The persons of a tree and the backing data each filter inspects (gender / birth-year / death
 * on the {@link Person}, claimed state via {@link ClaimService}, relationship participation via
 * {@link RelationshipRepository}, and canonical side via {@link KinshipAddressService}) are
 * generated and stubbed in-memory. Only valid filter values are generated, so validation never
 * throws and the test isolates the set semantics of combining filters.
 */
class SearchServiceFilterProperties {

    /** The five stored relationship-edge types a relationship-type filter may select. */
    private static final List<String> EDGE_TYPES = List.of(
            "bloodline_father", "bloodline_mother", "marriage", "non_bloodline", "asserted");

    /** The combinable filter fields under test. */
    private enum FilterKey {
        GENDER,
        SIDE,
        BIRTH,
        DEATH,
        CLAIMED,
        REL
    }

    /** The canonical-side outcome the resolver reports for a person from the viewpoint. */
    private enum SideOutcome {
        PATERNAL,
        MATERNAL,
        SELF,
        UNRESOLVED
    }

    /** Generated attributes of a single person plus the data each filter reads about it. */
    private record PersonSpec(
            String gender,
            Integer birthYear,
            boolean death,
            boolean claimed,
            Set<String> edgeTypes,
            SideOutcome side) {}

    // --- Property 25 --------------------------------------------------------------------------

    /**
     * Feature: vietnamese-family-tree, Property 25.
     *
     * <p>For any generated population and any non-empty subset of valid filters:
     *
     * <ol>
     *   <li><strong>Intersection (16.4):</strong> the all-filters result equals the intersection of
     *       the per-single-filter result sets.</li>
     *   <li><strong>Monotonicity (16.5):</strong> dropping any one filter yields a superset of the
     *       all-filters result.</li>
     * </ol>
     */
    @Property(tries = 200)
    void filterCombinationIsIntersectionAndMonotone(
            @ForAll("populations") @Size(min = 1, max = 12) List<PersonSpec> specs,
            @ForAll("genderValues") String genderF,
            @ForAll("sideValues") String sideF,
            @ForAll("birthRanges") int[] rangeF,
            @ForAll("deathValues") Boolean deathF,
            @ForAll("claimedValues") String claimedF,
            @ForAll("relValues") String relF) {

        // Determine which filters are active (non-null generated value); require at least one so
        // the intersection of single-filter sets is well defined.
        EnumSet<FilterKey> active = EnumSet.noneOf(FilterKey.class);
        if (genderF != null) {
            active.add(FilterKey.GENDER);
        }
        if (sideF != null) {
            active.add(FilterKey.SIDE);
        }
        if (rangeF != null) {
            active.add(FilterKey.BIRTH);
        }
        if (deathF != null) {
            active.add(FilterKey.DEATH);
        }
        if (claimedF != null) {
            active.add(FilterKey.CLAIMED);
        }
        if (relF != null) {
            active.add(FilterKey.REL);
        }
        Assume.that(!active.isEmpty());

        Fixture fixture = new Fixture(specs);

        FilterValues values = new FilterValues(genderF, sideF, rangeF, deathF, claimedF, relF);

        // (1) Intersection — the all-filters result equals the intersection of single-filter sets.
        Set<UUID> allFilters = fixture.searchIds(values.build(active));

        Set<UUID> intersection = null;
        for (FilterKey key : active) {
            Set<UUID> single = fixture.searchIds(values.build(EnumSet.of(key)));
            if (intersection == null) {
                intersection = new LinkedHashSet<>(single);
            } else {
                intersection.retainAll(single);
            }
        }
        assertThat(allFilters).isEqualTo(intersection);

        // (2) Monotonicity — removing any one active filter yields a superset of the full result.
        for (FilterKey key : active) {
            EnumSet<FilterKey> minusOne = EnumSet.copyOf(active);
            minusOne.remove(key);
            Set<UUID> withoutKey = fixture.searchIds(values.build(minusOne));
            assertThat(withoutKey).containsAll(allFilters);
        }
    }

    // --- Generators ---------------------------------------------------------------------------

    @Provide
    Arbitrary<List<PersonSpec>> populations() {
        Arbitrary<String> gender = Arbitraries.of("male", "female");
        Arbitrary<Integer> birthYear =
                Arbitraries.integers().between(1900, 2020).injectNull(0.2);
        Arbitrary<Boolean> death = Arbitraries.of(true, false);
        Arbitrary<Boolean> claimed = Arbitraries.of(true, false);
        Arbitrary<Set<String>> edges =
                Arbitraries.of(EDGE_TYPES).set().ofMinSize(0).ofMaxSize(EDGE_TYPES.size());
        Arbitrary<SideOutcome> side = Arbitraries.of(SideOutcome.values());
        Arbitrary<PersonSpec> spec = Combinators.combine(gender, birthYear, death, claimed, edges, side)
                .as(PersonSpec::new);
        return spec.list().ofMinSize(1).ofMaxSize(12);
    }

    @Provide
    Arbitrary<String> genderValues() {
        return Arbitraries.of("male", "female").injectNull(0.4);
    }

    @Provide
    Arbitrary<String> sideValues() {
        return Arbitraries.of("paternal", "maternal").injectNull(0.4);
    }

    @Provide
    Arbitrary<int[]> birthRanges() {
        Arbitrary<int[]> ranges = Combinators.combine(
                        Arbitraries.integers().between(1900, 2020),
                        Arbitraries.integers().between(1900, 2020))
                .as((a, b) -> new int[] {Math.min(a, b), Math.max(a, b)});
        return ranges.injectNull(0.4);
    }

    @Provide
    Arbitrary<Boolean> deathValues() {
        return Arbitraries.of(true, false).injectNull(0.4);
    }

    @Provide
    Arbitrary<String> claimedValues() {
        return Arbitraries.of("claimed", "unclaimed").injectNull(0.4);
    }

    @Provide
    Arbitrary<String> relValues() {
        return Arbitraries.of(EDGE_TYPES.toArray(new String[0])).injectNull(0.4);
    }

    // --- Helpers ------------------------------------------------------------------------------

    /** The generated filter values; {@link #build} projects them onto a chosen subset of keys. */
    private record FilterValues(
            String gender,
            String side,
            int[] range,
            Boolean death,
            String claimed,
            String rel) {

        SearchFilters build(Set<FilterKey> keys) {
            return new SearchFilters(
                    keys.contains(FilterKey.GENDER) ? gender : null,
                    keys.contains(FilterKey.SIDE) ? side : null,
                    keys.contains(FilterKey.BIRTH) ? range[0] : null,
                    keys.contains(FilterKey.BIRTH) ? range[1] : null,
                    keys.contains(FilterKey.DEATH) ? death : null,
                    keys.contains(FilterKey.CLAIMED) ? claimed : null,
                    keys.contains(FilterKey.REL) ? rel : null);
        }
    }

    /** An in-memory {@link SearchService} wired to the generated population's stubbed data. */
    private static final class Fixture {

        private final UUID treeId = UUID.randomUUID();
        private final UUID viewpoint = UUID.randomUUID();
        private final SearchService service;

        Fixture(List<PersonSpec> specs) {
            PersonRepository personRepository = mock(PersonRepository.class);
            KinshipAddressService kinshipAddressService = mock(KinshipAddressService.class);
            ClaimService claimService = mock(ClaimService.class);
            RelationshipRepository relationshipRepository = mock(RelationshipRepository.class);

            List<Person> persons = new ArrayList<>();
            for (PersonSpec spec : specs) {
                Person person = buildPerson(spec);
                persons.add(person);
                UUID id = person.getId();

                lenient().when(claimService.isClaimed(id)).thenReturn(spec.claimed());

                List<Relationship> edges = new ArrayList<>();
                for (String type : spec.edgeTypes()) {
                    edges.add(new Relationship(treeId, type, id, UUID.randomUUID()));
                }
                lenient().when(relationshipRepository.findBySourceIdOrTargetId(id, id))
                        .thenReturn(edges);

                lenient().when(kinshipAddressService.resolveDerivedAddress(treeId, viewpoint, id))
                        .thenReturn(resolutionFor(spec.side()));
            }

            when(personRepository.findByTreeId(treeId)).thenReturn(persons);
            lenient().when(personRepository.existsByIdAndTreeId(viewpoint, treeId)).thenReturn(true);

            this.service = new SearchService(
                    personRepository, kinshipAddressService, claimService, relationshipRepository);
        }

        Set<UUID> searchIds(SearchFilters filters) {
            SearchRequest request = new SearchRequest(null, null, viewpoint, filters);
            SearchResponse response = service.search(treeId, request);
            Set<UUID> ids = new LinkedHashSet<>();
            for (SearchResult result : response.results()) {
                ids.add(result.personId());
            }
            return ids;
        }

        private Person buildPerson(PersonSpec spec) {
            Person person = new Person(treeId, "P-" + UUID.randomUUID(), spec.gender());
            setId(person, UUID.randomUUID());
            person.setBirthYear(spec.birthYear());
            person.setDeathStatus(spec.death());
            return person;
        }

        private static AddressResolution resolutionFor(SideOutcome outcome) {
            return switch (outcome) {
                case PATERNAL -> resolvedWithSide(CanonicalRelation.Side.PATERNAL);
                case MATERNAL -> resolvedWithSide(CanonicalRelation.Side.MATERNAL);
                case SELF -> resolvedWithSide(CanonicalRelation.Side.SELF);
                case UNRESOLVED -> AddressResolution.unresolved(CanonicalResolution.noPath());
            };
        }

        private static AddressResolution resolvedWithSide(CanonicalRelation.Side side) {
            // SELF carries no term in practice; use a derived (undefined-for-region) resolution so
            // the canonical relation — and thus its side — is still inspectable by the filter.
            CanonicalRelation relation = new CanonicalRelation(
                    2, 1, side, CanonicalRelation.Gender.MALE,
                    CanonicalRelation.BranchOrder.ELDER, false);
            return AddressResolution.resolved("bác", CanonicalResolution.resolved(relation));
        }

        private static void setId(Person person, UUID id) {
            try {
                Field field = Person.class.getDeclaredField("id");
                field.setAccessible(true);
                field.set(person, id);
            } catch (ReflectiveOperationException e) {
                throw new IllegalStateException("Unable to set Person id for test fixture", e);
            }
        }
    }
}
