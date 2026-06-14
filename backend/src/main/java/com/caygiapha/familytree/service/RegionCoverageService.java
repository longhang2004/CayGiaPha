package com.caygiapha.familytree.service;

import com.caygiapha.familytree.entity.RegionKinshipTerm;
import com.caygiapha.familytree.entity.Tree;
import com.caygiapha.familytree.repository.RegionKinshipTermRepository;
import java.util.Collection;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Set;
import java.util.TreeSet;
import org.springframework.stereotype.Service;

/**
 * Data-integrity check for the <strong>regional coverage property</strong> (Requirement 9.7, design:
 * <em>Data Models — region_kinship_terms</em>, and Property 16): every {@code canonical_relation}
 * present for <em>any</em> region must be present for <em>all</em> three regions
 * ({@code Bac}/{@code Trung}/{@code Nam}). Because the {@code Kinship_Resolver} reads a single term
 * per (region, key) and a missing row means "undefined for this region" (9.4), identical key sets
 * across regions are exactly what guarantees the resolver resolves the same relation paths under
 * every region.
 *
 * <p>The pure {@link #evaluate} entry point operates on a supplied collection of terms so the same
 * coverage logic backs both the production startup check (reading the seeded
 * {@code region_kinship_terms} table) and the regional-coverage property test (task 3.11, Property
 * 16), which feeds it generated data. It performs no I/O.
 */
@Service
public class RegionCoverageService {

    private final RegionKinshipTermRepository regionKinshipTermRepository;

    public RegionCoverageService(RegionKinshipTermRepository regionKinshipTermRepository) {
        this.regionKinshipTermRepository = regionKinshipTermRepository;
    }

    /**
     * The outcome of a regional-coverage evaluation.
     *
     * @param complete       {@code true} iff every region defines exactly the same key set (9.7)
     * @param allKeys        the union of canonical-relation keys across all evaluated regions
     * @param missingByRegion for each region, the keys present in some region but missing from it
     *                        (empty sets for every region when {@link #complete} is {@code true})
     */
    public record CoverageResult(
            boolean complete, Set<String> allKeys, Map<String, Set<String>> missingByRegion) {

        /** A human-readable summary of any gaps, suitable for a fail-fast startup message. */
        public String describeGaps() {
            if (complete) {
                return "regional coverage complete: " + allKeys.size() + " canonical relations "
                        + "defined identically across all regions";
            }
            StringBuilder sb = new StringBuilder("regional coverage INCOMPLETE:");
            missingByRegion.forEach((region, missing) -> {
                if (!missing.isEmpty()) {
                    sb.append(' ').append(region).append(" is missing ").append(missing);
                    sb.append(';');
                }
            });
            return sb.toString();
        }
    }

    /**
     * Pure coverage evaluation over the three canonical regions (Bắc/Trung/Nam): collects the keys
     * defined for each region from {@code terms} and reports whether all regions cover the union of
     * keys. Reusable without a database (Property 16, task 3.11).
     *
     * @param terms all (region, canonical_relation, term) rows to evaluate
     * @return the {@link CoverageResult}; {@code complete} iff every region defines every key (9.7)
     */
    public static CoverageResult evaluate(Collection<RegionKinshipTerm> terms) {
        // Per-region key sets, initialised for all three regions so an absent region surfaces gaps.
        Map<String, Set<String>> keysByRegion = new LinkedHashMap<>();
        for (String region : Tree.VALID_REGIONS) {
            keysByRegion.put(region, new TreeSet<>());
        }

        Set<String> allKeys = new TreeSet<>();
        for (RegionKinshipTerm term : terms) {
            // Ignore any out-of-domain region defensively; the DB CHECK keeps these in {Bac,Trung,Nam}.
            keysByRegion.computeIfAbsent(term.getRegion(), r -> new TreeSet<>())
                    .add(term.getCanonicalRelation());
            allKeys.add(term.getCanonicalRelation());
        }

        Map<String, Set<String>> missingByRegion = new LinkedHashMap<>();
        boolean complete = true;
        for (String region : Tree.VALID_REGIONS) {
            Set<String> present = keysByRegion.getOrDefault(region, Set.of());
            Set<String> missing = new TreeSet<>(allKeys);
            missing.removeAll(present);
            missingByRegion.put(region, missing);
            if (!missing.isEmpty()) {
                complete = false;
            }
        }
        return new CoverageResult(complete, allKeys, missingByRegion);
    }

    /**
     * Evaluate regional coverage over the persisted {@code region_kinship_terms} table.
     *
     * @return the {@link CoverageResult} for the seeded configuration data
     */
    public CoverageResult checkCoverage() {
        return evaluate(regionKinshipTermRepository.findAll());
    }

    /** Whether the persisted region data satisfies the regional-coverage property (9.7). */
    public boolean isCovered() {
        return checkCoverage().complete();
    }

    /**
     * Enforce regional coverage, throwing when the persisted data violates the property (9.7).
     *
     * @throws IllegalStateException when some region is missing a canonical relation defined for
     *     another region
     */
    public void requireCovered() {
        CoverageResult result = checkCoverage();
        if (!result.complete()) {
            throw new IllegalStateException(
                    "region_kinship_terms violates the regional-coverage property (9.7): "
                            + result.describeGaps());
        }
    }
}
