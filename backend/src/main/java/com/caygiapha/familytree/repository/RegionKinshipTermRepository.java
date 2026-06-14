package com.caygiapha.familytree.repository;

import com.caygiapha.familytree.entity.RegionKinshipTerm;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

/**
 * Spring Data JPA repository for the {@link RegionKinshipTerm} configuration table (Requirement 9).
 *
 * <p>The {@code Kinship_Resolver}'s region-term lookup (Step 4) reads a single term for the tree's
 * region and the canonical-relation key it derived; a missing row is the "undefined for this
 * region" signal (9.4). The {@code findByRegion} query backs the regional-coverage data-integrity
 * check (9.7), validated separately.
 */
@Repository
public interface RegionKinshipTermRepository
        extends JpaRepository<RegionKinshipTerm, RegionKinshipTerm.Key> {

    /** The term for a (region, canonical_relation) pair, or empty when undefined for that region. */
    Optional<RegionKinshipTerm> findByRegionAndCanonicalRelation(
            String region, String canonicalRelation);

    /** All terms defined for a region (used by the regional-coverage check). (9.7) */
    List<RegionKinshipTerm> findByRegion(String region);
}
