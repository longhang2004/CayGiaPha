package com.caygiapha.familytree.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.caygiapha.familytree.dto.SearchRequest;
import com.caygiapha.familytree.dto.SearchResponse;
import com.caygiapha.familytree.dto.SearchResponse.SearchResult;
import com.caygiapha.familytree.entity.Person;
import com.caygiapha.familytree.repository.PersonRepository;
import com.caygiapha.familytree.repository.RelationshipRepository;
import java.lang.reflect.Field;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import net.jqwik.api.Arbitraries;
import net.jqwik.api.Arbitrary;
import net.jqwik.api.ForAll;
import net.jqwik.api.Property;
import net.jqwik.api.Provide;

/**
 * Property-based test for design <b>Property 23: Name search is normalized-substring exact</b>.
 *
 * <p>Feature: vietnamese-family-tree, Property 23
 *
 * <p>Name search returns <em>all and only</em> the persons whose case-folded, diacritic-stripped
 * display name contains the normalized query as a substring (Requirement 16.1). The property is
 * validated from two angles:
 *
 * <ol>
 *   <li><strong>{@link NameNormalizer#containsNormalized(String, String)}</strong> over generated
 *       Vietnamese-flavored names/queries (diacritics, đ/Đ, mixed case, ASCII) equals an
 *       <em>independent</em> normalization oracle ({@link #independentNormalize(String)}); and a
 *       query built by re-decorating a normalized substring of a name is always reported as a
 *       substring.</li>
 *   <li><strong>{@link SearchService#search(UUID, SearchRequest)}</strong> name-search path: for a
 *       generated set of persons and a generated query, the returned id set equals exactly the set
 *       of persons whose normalized display name contains the normalized query.</li>
 * </ol>
 *
 * <p>Validates: Requirements 16.1.
 *
 * <p>{@link PersonRepository} and {@link KinshipAddressService} are mocked: the repository serves an
 * in-memory person set and the kinship service is unused by name-only search, so this is a pure
 * domain property test with no database.
 */
class NormalizedSubstringNameSearchProperties {

    // --- Independent normalization oracle -----------------------------------------------------
    //
    // A second, deliberately different implementation of the case-fold + diacritic-strip + đ→d
    // transformation, built from an explicit precomposed-character → base-letter table rather than
    // Unicode NFD decomposition. Equality between this oracle and NameNormalizer.normalize is itself
    // asserted below, so the two implementations cross-check each other.

    /** Lowercase precomposed variants grouped by their base letter. */
    private static final String[] VARIANT_GROUPS = {
        "aàáảãạâầấẩẫậăằắẳẵặ",
        "eèéẻẽẹêềếểễệ",
        "iìíỉĩị",
        "oòóỏõọôồốổỗộơờớởỡợ",
        "uùúủũụưừứửữự",
        "yỳýỷỹỵ",
        "dđ",
    };

    /** Decorated lowercase char → base ASCII letter. */
    private static final Map<Character, Character> VARIANT_TO_BASE = new HashMap<>();

    /** Base ASCII letter → all its decorated variants (including the base itself), for re-decoration. */
    private static final Map<Character, char[]> BASE_TO_VARIANTS = new HashMap<>();

    /** The character pool generated names and queries are drawn from. */
    private static final char[] POOL;

    static {
        for (String group : VARIANT_GROUPS) {
            char base = group.charAt(0);
            BASE_TO_VARIANTS.put(base, group.toCharArray());
            for (int i = 0; i < group.length(); i++) {
                VARIANT_TO_BASE.put(group.charAt(i), base);
            }
        }

        // ASCII consonants and a space round out the pool so names look name-like.
        String consonants = "bcghklmnprstvx";
        StringBuilder pool = new StringBuilder();
        pool.append(' ');
        for (Map.Entry<Character, Character> e : VARIANT_TO_BASE.entrySet()) {
            char lower = e.getKey();
            pool.append(lower).append(Character.toUpperCase(lower));
        }
        for (int i = 0; i < consonants.length(); i++) {
            char lower = consonants.charAt(i);
            pool.append(lower).append(Character.toUpperCase(lower));
        }
        POOL = pool.toString().toCharArray();
    }

    /** Case-fold (Locale.ROOT) then map every precomposed VN letter to its base ASCII letter. */
    private static String independentNormalize(String input) {
        if (input == null) {
            return "";
        }
        String lower = input.toLowerCase(Locale.ROOT);
        StringBuilder sb = new StringBuilder(lower.length());
        for (int i = 0; i < lower.length(); i++) {
            char c = lower.charAt(i);
            Character base = VARIANT_TO_BASE.get(c);
            sb.append(base != null ? base.charValue() : c);
        }
        return sb.toString();
    }

    /** Re-decorate a normalized (base-letter) string, using seeds to pick variants and casing. */
    private static String redecorate(String normalized, List<Integer> seeds) {
        StringBuilder sb = new StringBuilder(normalized.length());
        for (int i = 0; i < normalized.length(); i++) {
            char base = normalized.charAt(i);
            int seed = seeds.get(i);
            char[] variants = BASE_TO_VARIANTS.get(base);
            char chosen = variants != null ? variants[seed % variants.length] : base;
            if (seed % 2 == 0) {
                chosen = Character.toUpperCase(chosen);
            }
            sb.append(chosen);
        }
        return sb.toString();
    }

    // --- Angle 1: NameNormalizer.containsNormalized matches the independent oracle -------------

    @Provide
    Arbitrary<String> poolStrings() {
        return Arbitraries.strings().withChars(POOL).ofMinLength(0).ofMaxLength(20);
    }

    @Property(tries = 300)
    void normalizeMatchesIndependentOracle(@ForAll("poolStrings") String text) {
        // Feature: vietnamese-family-tree, Property 23
        assertThat(NameNormalizer.normalize(text)).isEqualTo(independentNormalize(text));
    }

    @Property(tries = 300)
    void containsNormalizedEqualsNormalizedSubstringOracle(
            @ForAll("poolStrings") String name, @ForAll("poolStrings") String query) {
        // Feature: vietnamese-family-tree, Property 23
        boolean expected = independentNormalize(name).contains(independentNormalize(query));
        assertThat(NameNormalizer.containsNormalized(name, query)).isEqualTo(expected);
    }

    /** A name plus a query that is, by construction, a re-decorated normalized substring of it. */
    record NameAndSubstring(String name, String query) {}

    @Provide
    Arbitrary<NameAndSubstring> nameWithDerivedSubstring() {
        Arbitrary<String> names =
                Arbitraries.strings().withChars(POOL).ofMinLength(1).ofMaxLength(20);
        return names.flatMap(name -> {
            String norm = independentNormalize(name);
            int n = norm.length();
            if (n == 0) {
                // Empty normalized name: the empty query is trivially a substring.
                return Arbitraries.just(new NameAndSubstring(name, ""));
            }
            return Arbitraries.integers().between(0, n - 1).flatMap(start ->
                    Arbitraries.integers().between(1, n - start).flatMap(len -> {
                        String sub = norm.substring(start, start + len);
                        return Arbitraries.integers().between(0, 1_000).list().ofSize(len)
                                .map(seeds -> new NameAndSubstring(name, redecorate(sub, seeds)));
                    }));
        });
    }

    @Property(tries = 300)
    void reDecoratedNormalizedSubstringIsAlwaysASubstring(
            @ForAll("nameWithDerivedSubstring") NameAndSubstring pair) {
        // Feature: vietnamese-family-tree, Property 23
        // The query normalizes back to a substring of the name's normalized form, so it must match.
        assertThat(NameNormalizer.containsNormalized(pair.name(), pair.query())).isTrue();
        assertThat(independentNormalize(pair.name()))
                .contains(independentNormalize(pair.query()));
    }

    // --- Angle 2: SearchService.search name path returns all and only matching persons ---------

    /** A generated person set plus a (non-empty, ≤100-char) name query to search for. */
    record SearchScenario(List<String> names, String nameQuery) {}

    @Provide
    Arbitrary<SearchScenario> searchScenarios() {
        Arbitrary<List<String>> nameLists =
                Arbitraries.strings().withChars(POOL).ofMinLength(1).ofMaxLength(15)
                        .list().ofMinSize(0).ofMaxSize(8);

        return nameLists.flatMap(names -> {
            // Random non-empty query drawn from the same pool.
            Arbitrary<String> randomQuery =
                    Arbitraries.strings().withChars(POOL).ofMinLength(1).ofMaxLength(15);

            if (names.isEmpty()) {
                return randomQuery.map(q -> new SearchScenario(names, q));
            }

            // A query derived (by construction) from a normalized substring of one of the names,
            // guaranteeing genuine matches alongside the random-query case.
            Arbitrary<String> derivedQuery = Arbitraries.of(names).flatMap(name -> {
                String norm = independentNormalize(name);
                int n = norm.length();
                if (n == 0) {
                    return randomQuery;
                }
                return Arbitraries.integers().between(0, n - 1).flatMap(start ->
                        Arbitraries.integers().between(1, n - start).flatMap(len -> {
                            String sub = norm.substring(start, start + len);
                            return Arbitraries.integers().between(0, 1_000).list().ofSize(len)
                                    .map(seeds -> redecorate(sub, seeds));
                        }));
            });

            return Arbitraries.oneOf(randomQuery, derivedQuery)
                    .map(q -> new SearchScenario(names, q));
        });
    }

    @Property(tries = 300)
    void searchReturnsAllAndOnlyNormalizedSubstringMatches(
            @ForAll("searchScenarios") SearchScenario scenario) {
        // Feature: vietnamese-family-tree, Property 23
        UUID treeId = UUID.randomUUID();

        PersonRepository personRepository = mock(PersonRepository.class);
        // KinshipAddressService, ClaimService and RelationshipRepository are unused by name-only
        // search; mock them to satisfy the SearchService constructor.
        KinshipAddressService kinshipAddressService = mock(KinshipAddressService.class);
        ClaimService claimService = mock(ClaimService.class);
        RelationshipRepository relationshipRepository = mock(RelationshipRepository.class);
        SearchService service = new SearchService(
                personRepository, kinshipAddressService, claimService, relationshipRepository);

        List<Person> persons = new ArrayList<>();
        for (String name : scenario.names()) {
            Person p = new Person(treeId, name, "male");
            setId(p, UUID.randomUUID());
            persons.add(p);
        }
        when(personRepository.findByTreeId(treeId)).thenReturn(persons);

        String query = scenario.nameQuery();
        SearchRequest request = new SearchRequest(query, null, null, null);

        // Independent oracle: all and only persons whose normalized name contains the normalized
        // query as a substring.
        String normQuery = independentNormalize(query);
        Set<UUID> expected = persons.stream()
                .filter(p -> independentNormalize(p.getDisplayName()).contains(normQuery))
                .map(Person::getId)
                .collect(Collectors.toSet());

        SearchResponse response = service.search(treeId, request);
        Set<UUID> actual = response.results().stream()
                .map(SearchResult::personId)
                .collect(Collectors.toSet());

        assertThat(actual).isEqualTo(expected);
        assertThat(response.noMatches()).isEqualTo(expected.isEmpty());
    }

    /** Persons are persisted with a generated id; for property fixtures we set it reflectively. */
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
