package com.caygiapha.familytree.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.caygiapha.familytree.dto.SearchRequest;
import com.caygiapha.familytree.dto.SearchResponse;
import com.caygiapha.familytree.dto.SearchResponse.SearchResult;
import com.caygiapha.familytree.entity.Person;
import com.caygiapha.familytree.repository.PersonRepository;
import com.caygiapha.familytree.repository.RelationshipRepository;
import com.caygiapha.familytree.service.CanonicalRelation.BranchOrder;
import com.caygiapha.familytree.service.CanonicalRelation.Gender;
import com.caygiapha.familytree.service.CanonicalRelation.Side;
import java.lang.reflect.Field;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import net.jqwik.api.Arbitraries;
import net.jqwik.api.Arbitrary;
import net.jqwik.api.Combinators;
import net.jqwik.api.ForAll;
import net.jqwik.api.Property;
import net.jqwik.api.Provide;
import org.mockito.invocation.InvocationOnMock;

/**
 * Property-based test for design <b>Property 24: Address search exact match</b>.
 *
 * <p>Feature: vietnamese-family-tree, Property 24
 *
 * <p>An address search returns <em>all and only</em> the persons of the tree whose computed
 * {@code Form_Of_Address} from the given viewpoint equals the query term <em>exactly</em>. For each
 * person the address {@code viewpointId → person} is resolved via {@link KinshipAddressService}
 * (yielding an {@link AddressResolution}); the person matches iff that resolution carries a form of
 * address ({@code RESOLVED} term or {@code ASSERTED} label) that string-equals the query. Persons
 * with no defined address ({@code UNDEFINED_FOR_REGION} / {@code UNRESOLVED}) never match, and a
 * person whose term differs from the query is excluded.
 *
 * <p>Validates: Requirements 16.2.
 *
 * <p>{@link PersonRepository} and {@link KinshipAddressService} are mocked: the repository acts as
 * an in-memory store ({@code findByTreeId} returns the generated persons; the viewpoint exists),
 * and the resolver is a map-backed mock keyed on the target person id. This keeps the property a
 * pure check of the {@code Search_Service} exact-match semantics, independent of the resolver.
 */
class AddressSearchExactMatchProperties {

    /**
     * A small alphabet of plausible address terms. Drawing both the generated per-person addresses
     * and the query from this set guarantees frequent collisions, so the property meaningfully
     * exercises both matches and non-matches rather than (almost) always returning the empty set.
     */
    private static final List<String> TERMS =
            List.of("bác", "chú", "cô", "dì", "cậu", "cháu", "ông", "bà");

    /** The four outcome categories a resolver can return for a (viewpoint, target) pair. */
    enum Kind {
        /** A dialect term was derived for the tree's region; carries the term. (9.3) */
        RESOLVED,
        /** A directly asserted edge; carries the stored label verbatim. (6.4) */
        ASSERTED,
        /** A relation was derived but no region term exists; carries no form of address. (9.4) */
        UNDEFINED_FOR_REGION,
        /** No path / indeterminate order; carries no form of address. (8.5, 8.7) */
        UNRESOLVED
    }

    /**
     * A generated person together with the address the resolver will report for it from the
     * viewpoint. {@code term} is only meaningful for the term-carrying kinds (RESOLVED, ASSERTED).
     */
    record PersonSpec(String displayName, Kind kind, String term) {

        /** The form of address this spec should report, or {@code null} when none is defined. */
        String formOfAddress() {
            return (kind == Kind.RESOLVED || kind == Kind.ASSERTED) ? term : null;
        }
    }

    @Provide
    Arbitrary<List<PersonSpec>> personSpecs() {
        Arbitrary<String> displayNames =
                Arbitraries.strings().withCharRange('a', 'z').ofMinLength(1).ofMaxLength(8);
        Arbitrary<Kind> kinds = Arbitraries.of(Kind.values());
        Arbitrary<String> terms = Arbitraries.of(TERMS);

        Arbitrary<PersonSpec> spec =
                Combinators.combine(displayNames, kinds, terms).as(PersonSpec::new);
        return spec.list().ofMinSize(0).ofMaxSize(12);
    }

    @Provide
    Arbitrary<String> addressQuery() {
        return Arbitraries.of(TERMS);
    }

    @Property(tries = 200)
    void addressSearchReturnsAllAndOnlyPersonsWhoseAddressEqualsQuery(
            @ForAll("personSpecs") List<PersonSpec> specs,
            @ForAll("addressQuery") String addressQuery) {

        UUID treeId = UUID.randomUUID();
        UUID viewpointId = UUID.randomUUID();

        // Materialise the generated specs into persons with stable ids, recording the resolution
        // each person's id should map to and the independently-computed oracle of expected matches.
        List<Person> persons = new ArrayList<>();
        Map<UUID, AddressResolution> resolutions = new HashMap<>();
        Set<UUID> expected = new java.util.HashSet<>();
        for (PersonSpec s : specs) {
            UUID id = UUID.randomUUID();
            Person person = new Person(treeId, s.displayName(), "male");
            setId(person, id);
            persons.add(person);
            resolutions.put(id, resolutionFor(s));
            if (addressQuery.equals(s.formOfAddress())) {
                expected.add(id);
            }
        }

        PersonRepository personRepository = mock(PersonRepository.class);
        KinshipAddressService kinshipAddressService = mock(KinshipAddressService.class);
        when(personRepository.findByTreeId(treeId)).thenReturn(persons);
        when(personRepository.existsByIdAndTreeId(viewpointId, treeId)).thenReturn(true);
        // resolveAddress is keyed (treeId, viewpoint, target); answer per target id from the map.
        when(kinshipAddressService.resolveAddress(eq(treeId), eq(viewpointId), any()))
                .thenAnswer((InvocationOnMock i) -> resolutions.get((UUID) i.getArgument(2)));

        SearchService service = new SearchService(personRepository, kinshipAddressService,
                mock(com.caygiapha.familytree.service.ClaimService.class),
                mock(com.caygiapha.familytree.repository.RelationshipRepository.class));
        SearchRequest request = new SearchRequest(null, addressQuery, viewpointId, null);

        SearchResponse response = service.search(treeId, request);

        Set<UUID> actual =
                response.results().stream().map(SearchResult::personId).collect(Collectors.toSet());

        // All and only: the result is exactly the set of persons whose form of address equals the
        // query. This subsumes the negative cases — undefined/unresolved persons (no form of
        // address) and persons whose term differs are necessarily absent from `expected`.
        assertThat(actual).isEqualTo(expected);
        // 16.6 — the no-matches indication is set iff (and only iff) there are no matches.
        assertThat(response.noMatches()).isEqualTo(expected.isEmpty());
    }

    /** Build the {@link AddressResolution} a person's spec should resolve to from the viewpoint. */
    private static AddressResolution resolutionFor(PersonSpec s) {
        return switch (s.kind()) {
            case RESOLVED -> AddressResolution.resolved(s.term(), sampleResolvedCanonical());
            case ASSERTED -> AddressResolution.asserted(s.term());
            case UNDEFINED_FOR_REGION ->
                    AddressResolution.undefinedForRegion(sampleResolvedCanonical());
            case UNRESOLVED -> AddressResolution.unresolved(CanonicalResolution.noPath());
        };
    }

    /** A minimal valid derived canonical descriptor (its exact shape is irrelevant to the search). */
    private static CanonicalResolution sampleResolvedCanonical() {
        return CanonicalResolution.resolved(
                new CanonicalRelation(1, 0, Side.SELF, Gender.MALE, BranchOrder.SELF, false));
    }

    /** Persons are persisted with a generated id; for property tests we set it reflectively. */
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
