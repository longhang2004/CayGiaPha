package com.caygiapha.familytree.service;

import static org.assertj.core.api.Assertions.assertThat;

import com.caygiapha.familytree.entity.RegionKinshipTerm;
import com.caygiapha.familytree.entity.Tree;
import com.caygiapha.familytree.service.RegionCoverageService.CoverageResult;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.TreeSet;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import net.jqwik.api.Arbitraries;
import net.jqwik.api.Arbitrary;
import net.jqwik.api.Combinators;
import net.jqwik.api.Example;
import net.jqwik.api.ForAll;
import net.jqwik.api.Property;
import net.jqwik.api.Provide;

/**
 * Property-based tests for the <strong>regional-coverage invariant</strong> (design: <em>Property
 * 16: Regional coverage</em>; Requirement 9.7).
 *
 * <p>Feature: vietnamese-family-tree, Property 16
 *
 * <p><strong>Property 16: Regional coverage</strong> — for all canonical relations that resolve to
 * a defined term under any region in {Bắc, Trung, Nam}, the relation resolves to a defined term
 * under <em>every</em> region in the set. Because the {@code Kinship_Resolver} reads a single term
 * per {@code (region, canonical_relation)} and a missing row means "undefined for this region"
 * (9.4), this invariant is exactly: every region defines the same key set, i.e. the union of all
 * keys. {@link RegionCoverageService#evaluate} is the detector under test.
 *
 * <p>Two complementary angles are exercised:
 *
 * <ol>
 *   <li><strong>Generated configurations:</strong> a set of canonical keys with an independently
 *       generated per-region presence matrix is turned into a {@link RegionKinshipTerm} list. An
 *       independent oracle computes the expected union, completeness, and per-region gaps, and the
 *       detector is asserted to match it on both complete and deliberately-incomplete inputs. When
 *       the detector reports complete, every union key is checked to resolve to a defined term under
 *       all three regions.</li>
 *   <li><strong>Actual seeded data:</strong> the rows seeded by
 *       {@code V2__seed_region_kinship_terms.sql} are parsed (no database needed, mirroring
 *       {@link RegionCoverageServiceTest}) and asserted to satisfy the property — every canonical
 *       relation present for any region is present for all three.</li>
 * </ol>
 *
 * <p><strong>Validates: Requirements 9.7</strong>
 */
class RegionCoverageProperties {

    private static final Path SEED_MIGRATION =
            Path.of("src/main/resources/db/migration/V2__seed_region_kinship_terms.sql");

    // Matches rows like:  ('Bac', 'u2:d1:PATERNAL:MALE:ELDER:s0', 'bác'),
    private static final Pattern ROW = Pattern.compile(
            "\\(\\s*'(Bac|Trung|Nam)'\\s*,\\s*'([^']+)'\\s*,\\s*'([^']+)'\\s*\\)");

    /**
     * One canonical relation together with its presence under each of the three regions, indexed to
     * match {@link Tree#VALID_REGIONS} ({@code 0=Bac, 1=Trung, 2=Nam}).
     *
     * @param key the canonical-relation key
     * @param inBac whether the key is defined under Bắc
     * @param inTrung whether the key is defined under Trung
     * @param inNam whether the key is defined under Nam
     */
    private record KeySpec(String key, boolean inBac, boolean inTrung, boolean inNam) {

        /** Presence under the region at {@code regionIndex} in {@link Tree#VALID_REGIONS}. */
        boolean presentAt(int regionIndex) {
            return switch (regionIndex) {
                case 0 -> inBac;
                case 1 -> inTrung;
                default -> inNam;
            };
        }
    }

    /**
     * A generated coverage configuration.
     *
     * @param keys distinct canonical relations with their per-region presence
     * @param forceComplete when {@code true}, every key is treated as present under all regions so
     *     deliberately-complete configurations are sampled with meaningful frequency alongside the
     *     freely-generated (usually incomplete) ones
     */
    private record Config(List<KeySpec> keys, boolean forceComplete) {

        /** Effective presence of {@code spec} at {@code regionIndex}, honouring {@link #forceComplete}. */
        boolean present(KeySpec spec, int regionIndex) {
            return forceComplete || spec.presentAt(regionIndex);
        }
    }

    @Provide
    Arbitrary<Config> configs() {
        Arbitrary<String> keyName =
                Arbitraries.strings().withCharRange('a', 'z').ofMinLength(3).ofMaxLength(8);
        Arbitrary<KeySpec> keySpec = Combinators.combine(
                        keyName,
                        Arbitraries.of(true, false),
                        Arbitraries.of(true, false),
                        Arbitraries.of(true, false))
                .as(KeySpec::new);
        Arbitrary<List<KeySpec>> keyList =
                keySpec.list().ofMinSize(1).ofMaxSize(8).uniqueElements(KeySpec::key);
        // Bias ~1/4 of cases to forceComplete so complete and incomplete configs are both common.
        Arbitrary<Boolean> forceComplete = Arbitraries.of(true, false, false, false);
        return Combinators.combine(keyList, forceComplete).as(Config::new);
    }

    /**
     * Feature: vietnamese-family-tree, Property 16
     *
     * <p>For every generated configuration, {@link RegionCoverageService#evaluate} agrees exactly
     * with an independent oracle: its {@code allKeys} equals the union of keys present in some
     * region, its {@code complete} flag is {@code true} iff every region defines every union key,
     * and its {@code missingByRegion} lists precisely the union keys absent from each region. When
     * complete, every union key is confirmed to resolve to a defined term under all three regions.
     * (9.7)
     *
     * <p><strong>Validates: Requirements 9.7</strong>
     */
    @Property(tries = 200)
    void evaluateMatchesCoverageOracle(@ForAll("configs") Config config) {
        // Build the (region, key, term) rows for every region in which a key is present.
        List<RegionKinshipTerm> terms = new ArrayList<>();
        for (KeySpec spec : config.keys()) {
            for (int i = 0; i < Tree.VALID_REGIONS.size(); i++) {
                if (config.present(spec, i)) {
                    terms.add(new RegionKinshipTerm(
                            Tree.VALID_REGIONS.get(i), spec.key(), "term-" + spec.key()));
                }
            }
        }

        // Independent oracle: union of keys present in any region, per-region gaps, completeness.
        Set<String> expectedUnion = new TreeSet<>();
        for (KeySpec spec : config.keys()) {
            for (int i = 0; i < Tree.VALID_REGIONS.size(); i++) {
                if (config.present(spec, i)) {
                    expectedUnion.add(spec.key());
                }
            }
        }
        Map<String, Set<String>> expectedMissing = new java.util.LinkedHashMap<>();
        boolean expectedComplete = true;
        for (int i = 0; i < Tree.VALID_REGIONS.size(); i++) {
            String region = Tree.VALID_REGIONS.get(i);
            Set<String> missing = new TreeSet<>();
            for (KeySpec spec : config.keys()) {
                if (expectedUnion.contains(spec.key()) && !config.present(spec, i)) {
                    missing.add(spec.key());
                }
            }
            expectedMissing.put(region, missing);
            if (!missing.isEmpty()) {
                expectedComplete = false;
            }
        }

        CoverageResult result = RegionCoverageService.evaluate(terms);

        // Detector equals the oracle on union, completeness, and per-region gaps.
        assertThat(result.allKeys()).containsExactlyInAnyOrderElementsOf(expectedUnion);
        assertThat(result.complete()).isEqualTo(expectedComplete);
        for (String region : Tree.VALID_REGIONS) {
            assertThat(result.missingByRegion().get(region))
                    .as("missing keys for region %s", region)
                    .containsExactlyInAnyOrderElementsOf(expectedMissing.get(region));
        }

        // When complete, every union key resolves to a defined term under all three regions.
        if (result.complete()) {
            Set<String> definedPairs = new HashSet<>();
            for (RegionKinshipTerm term : terms) {
                definedPairs.add(term.getRegion() + "\u0000" + term.getCanonicalRelation());
            }
            for (String key : result.allKeys()) {
                for (String region : Tree.VALID_REGIONS) {
                    assertThat(definedPairs)
                            .as("term defined for region %s and relation %s", region, key)
                            .contains(region + "\u0000" + key);
                }
            }
        }
    }

    /**
     * Feature: vietnamese-family-tree, Property 16
     *
     * <p>The actual data seeded by {@code V2__seed_region_kinship_terms.sql} satisfies regional
     * coverage: every canonical relation present for any region is present for all three, so each
     * region defines exactly the union of keys. (9.7)
     *
     * <p><strong>Validates: Requirements 9.7</strong>
     */
    @Example
    void seededDataSatisfiesRegionalCoverage() throws IOException {
        List<RegionKinshipTerm> seeded = parseSeededTerms();

        // Sanity: the seed actually populated a non-trivial key set across regions.
        assertThat(seeded).isNotEmpty();
        Set<String> distinctKeys = new HashSet<>();
        seeded.forEach(t -> distinctKeys.add(t.getCanonicalRelation()));
        assertThat(distinctKeys.size()).isGreaterThan(10);

        CoverageResult result = RegionCoverageService.evaluate(seeded);

        assertThat(result.complete())
                .as("seeded region_kinship_terms must satisfy regional coverage: %s",
                        result.describeGaps())
                .isTrue();

        // Each region defines exactly the union of keys (identical key sets).
        for (String region : Tree.VALID_REGIONS) {
            long countForRegion = seeded.stream().filter(t -> t.getRegion().equals(region)).count();
            assertThat(countForRegion).isEqualTo(result.allKeys().size());
        }
    }

    private List<RegionKinshipTerm> parseSeededTerms() throws IOException {
        assertThat(Files.exists(SEED_MIGRATION))
                .as("seed migration file must exist at %s", SEED_MIGRATION.toAbsolutePath())
                .isTrue();
        String sql = Files.readString(SEED_MIGRATION, StandardCharsets.UTF_8);

        List<RegionKinshipTerm> terms = new ArrayList<>();
        Matcher matcher = ROW.matcher(sql);
        while (matcher.find()) {
            terms.add(new RegionKinshipTerm(matcher.group(1), matcher.group(2), matcher.group(3)));
        }
        return terms;
    }
}
