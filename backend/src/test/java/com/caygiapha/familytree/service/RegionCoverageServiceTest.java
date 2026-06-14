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
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.junit.jupiter.api.Test;

/**
 * Unit tests for {@link RegionCoverageService} — the regional-coverage data-integrity check
 * (Requirement 9.7, Property 16):
 *
 * <ul>
 *   <li>the pure {@link RegionCoverageService#evaluate} logic reports complete coverage when every
 *       region defines the same key set, and reports the precise gaps otherwise;</li>
 *   <li>the actual seeded data in {@code V2__seed_region_kinship_terms.sql} satisfies the property —
 *       every canonical relation present for any region is present for all three.</li>
 * </ul>
 *
 * <p>The seed is validated by parsing the migration file directly (no database required), which is
 * the same invariant the startup {@code RegionCoverageValidator} enforces against the live table.
 */
class RegionCoverageServiceTest {

    private static final Path SEED_MIGRATION =
            Path.of("src/main/resources/db/migration/V2__seed_region_kinship_terms.sql");

    // Matches rows like:  ('Bac',   'u2:d1:PATERNAL:MALE:ELDER:s0',   'bác'),
    private static final Pattern ROW = Pattern.compile(
            "\\(\\s*'(Bac|Trung|Nam)'\\s*,\\s*'([^']+)'\\s*,\\s*'([^']+)'\\s*\\)");

    @Test
    void evaluateReportsCompleteWhenAllRegionsShareTheSameKeys() {
        List<RegionKinshipTerm> terms = new ArrayList<>();
        for (String region : Tree.VALID_REGIONS) {
            terms.add(new RegionKinshipTerm(region, "u1:d0:PATERNAL:MALE:SELF:s0", "bố"));
            terms.add(new RegionKinshipTerm(region, "u2:d0:PATERNAL:MALE:SELF:s0", "ông"));
        }

        CoverageResult result = RegionCoverageService.evaluate(terms);

        assertThat(result.complete()).isTrue();
        assertThat(result.allKeys())
                .containsExactlyInAnyOrder(
                        "u1:d0:PATERNAL:MALE:SELF:s0", "u2:d0:PATERNAL:MALE:SELF:s0");
        assertThat(result.missingByRegion().values()).allSatisfy(set -> assertThat(set).isEmpty());
    }

    @Test
    void evaluateReportsTheMissingKeysWhenARegionLacksOne() {
        List<RegionKinshipTerm> terms = new ArrayList<>();
        // 'cô' defined for Bac and Trung but NOT Nam -> Nam is missing it.
        terms.add(new RegionKinshipTerm("Bac", "u2:d1:PATERNAL:FEMALE:YOUNGER:s0", "cô"));
        terms.add(new RegionKinshipTerm("Trung", "u2:d1:PATERNAL:FEMALE:YOUNGER:s0", "cô"));
        // All three define the grandparent key.
        for (String region : Tree.VALID_REGIONS) {
            terms.add(new RegionKinshipTerm(region, "u2:d0:PATERNAL:MALE:SELF:s0", "ông"));
        }

        CoverageResult result = RegionCoverageService.evaluate(terms);

        assertThat(result.complete()).isFalse();
        assertThat(result.missingByRegion().get("Nam"))
                .containsExactly("u2:d1:PATERNAL:FEMALE:YOUNGER:s0");
        assertThat(result.missingByRegion().get("Bac")).isEmpty();
        assertThat(result.missingByRegion().get("Trung")).isEmpty();
    }

    @Test
    void seededMigrationDataSatisfiesRegionalCoverage() throws IOException {
        List<RegionKinshipTerm> seeded = parseSeededTerms();

        // Sanity: the seed actually populated all three regions with a non-trivial key set.
        assertThat(seeded).isNotEmpty();
        Set<String> distinctKeys = new HashSet<>();
        seeded.forEach(t -> distinctKeys.add(t.getCanonicalRelation()));
        assertThat(distinctKeys.size()).isGreaterThan(10);

        CoverageResult result = RegionCoverageService.evaluate(seeded);

        // 9.7 — every canonical relation present for any region is present for all three.
        assertThat(result.complete())
                .as("seeded region_kinship_terms must satisfy regional coverage: %s",
                        result.describeGaps())
                .isTrue();

        // Each region defines exactly the union of keys (identical key sets).
        for (String region : Tree.VALID_REGIONS) {
            long countForRegion =
                    seeded.stream().filter(t -> t.getRegion().equals(region)).count();
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
