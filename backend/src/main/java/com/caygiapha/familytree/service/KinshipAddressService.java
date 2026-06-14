package com.caygiapha.familytree.service;

import com.caygiapha.familytree.entity.Person;
import com.caygiapha.familytree.entity.RegionKinshipTerm;
import com.caygiapha.familytree.entity.Relationship;
import com.caygiapha.familytree.entity.Tree;
import com.caygiapha.familytree.repository.PersonRepository;
import com.caygiapha.familytree.repository.RegionKinshipTermRepository;
import com.caygiapha.familytree.repository.RelationshipRepository;
import com.caygiapha.familytree.repository.TreeRepository;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.function.Function;
import org.springframework.stereotype.Service;

/**
 * Region-aware address resolution layer (design: <em>Kinship_Resolver Algorithm — Step 4, Look up
 * the regional term</em>, and <em>Symmetry</em>). It composes the pure {@link KinshipResolver}
 * (Steps 2 &amp; 3) with the {@code region_kinship_terms} configuration data layer to produce the
 * Vietnamese <em>form of address</em> an ego uses to address a target. (Requirements 8.6, 9.3, 9.4)
 *
 * <h2>Pipeline</h2>
 *
 * <ol>
 *   <li>Resolve the {@link CanonicalRelation} via {@link KinshipResolver#resolveCanonical}. If the
 *       path is unresolved (no path, or an indeterminate elder/younger distinction), return the
 *       unresolved indicator unchanged. (8.5, 8.7)</li>
 *   <li>Encode the descriptor with {@link CanonicalRelation#canonicalKey()} — the stable seam — and
 *       query {@code region_kinship_terms} for {@code (region, canonicalKey)}. (9.3)</li>
 *   <li>Return the {@code term} when a row exists, or the explicit "undefined for this region"
 *       indicator when none does, leaving the tree's stored region unchanged. (9.4)</li>
 * </ol>
 *
 * <h2>Symmetry (8.6)</h2>
 *
 * <p>For any pair connected solely by derived relationships, reversing ego and target swaps the
 * descriptor's {@code upCount}/{@code downCount} and flips the branch order, so the reversed
 * canonical key is distinct and maps to the <em>inverse</em> term: if ego addresses target with a
 * descendant term (cháu), the canonical key for the reversed path encodes the corresponding
 * ascendant relation, whose region row holds the ascendant term (ông/bà/bác/chú/cô/dì/cậu). The
 * symmetry is therefore guaranteed structurally by the key encoding together with the region table
 * (the region data's inverse-pairing is validated by the regional-coverage data and the symmetry
 * property test).
 *
 * <p>Asserted edges are handled by a dedicated short-circuit: the derived projection excludes them,
 * so the resolver never derives <em>across</em> an asserted edge; additionally, when two persons are
 * directly joined by an {@code Asserted_Relationship}, {@link #resolveAddress} returns the stored
 * label verbatim (an {@link AddressResolution.Status#ASSERTED} result) instead of attempting a
 * derived lookup. Because the lookup is keyed on that exact ordered pair, the asserted label is
 * never surfaced as the address toward any other person. (Requirement 6.4)
 */
@Service
public class KinshipAddressService {

    /** Edge {@code type} discriminator stored for {@code Asserted_Relationship} edges. */
    private static final String ASSERTED_TYPE = RelationshipService.TYPE_ASSERTED;

    /** {@code derivation_state} value while an edge is still an unupgraded asserted relationship. */
    private static final String ASSERTED_STATE = "asserted";

    /**
     * Looks up the dialect term for a {@code (region, canonicalKey)} pair, returning empty when the
     * combination is undefined. A seam that lets the core resolution be exercised without a
     * database (the production implementation reads {@code region_kinship_terms}).
     */
    @FunctionalInterface
    public interface RegionTermLookup {
        Optional<String> term(String region, String canonicalKey);
    }

    /**
     * Looks up the stored label of a direct {@code Asserted_Relationship} from {@code egoId} to
     * {@code targetId}, returning empty when the pair is not directly joined by an (unupgraded)
     * asserted edge. A seam that lets the asserted short-circuit be exercised without a database
     * (the production implementation reads the {@code relationships} table). (Requirement 6.4)
     */
    @FunctionalInterface
    public interface AssertedLabelLookup {
        Optional<String> label(UUID egoId, UUID targetId);
    }

    private final KinshipResolver resolver;
    private final KinshipGraphProjectionCache projectionCache;
    private final PersonRepository personRepository;
    private final TreeRepository treeRepository;
    private final RegionKinshipTermRepository regionKinshipTermRepository;
    private final RelationshipRepository relationshipRepository;

    public KinshipAddressService(
            KinshipResolver resolver,
            KinshipGraphProjectionCache projectionCache,
            PersonRepository personRepository,
            TreeRepository treeRepository,
            RegionKinshipTermRepository regionKinshipTermRepository,
            RelationshipRepository relationshipRepository) {
        this.resolver = resolver;
        this.projectionCache = projectionCache;
        this.personRepository = personRepository;
        this.treeRepository = treeRepository;
        this.regionKinshipTermRepository = regionKinshipTermRepository;
        this.relationshipRepository = relationshipRepository;
    }

    /**
     * Resolve the region-aware form of address from {@code egoId} to {@code targetId} within a tree,
     * reading the tree's stored region and the persisted region-term configuration.
     *
     * @param treeId   the tree both persons belong to (supplies the region and the graph)
     * @param egoId    the viewpoint person
     * @param targetId the person being addressed
     * @return a {@link AddressResolution}: a defined term, "undefined for region", or unresolved
     */
    public AddressResolution resolveAddress(UUID treeId, UUID egoId, UUID targetId) {
        return resolveAddress(treeId, egoId, targetId, this::lookupAssertedLabel);
    }

    /**
     * Resolve the <em>derived-only</em> form of address from {@code egoId} to {@code targetId},
     * ignoring any direct asserted edge between the pair (design: <em>Asserted vs Derived
     * Relationships — Upgrade and conflict-detection flow</em>, Requirement 7.3).
     *
     * <p>The asserted-upgrade scan needs the term the graph <em>would</em> derive once an unbroken
     * bloodline path completes the pair, so that it can compare it against the stored asserted
     * label (7.4/7.5). Because the asserted edge joining the pair is still in the {@code asserted}
     * derivation state at scan time, {@link #resolveAddress(UUID, UUID, UUID)} would short-circuit
     * and return the stored label instead of the derived term; this variant skips that
     * short-circuit by supplying an empty asserted-label lookup, yielding the purely derived
     * resolution. The projection already excludes asserted edges, so the result reflects only the
     * bloodline/marriage graph.
     *
     * @param treeId   the tree both persons belong to (supplies the region and the graph)
     * @param egoId    the viewpoint person
     * @param targetId the person being addressed
     * @return the derived {@link AddressResolution}, never short-circuited by an asserted edge
     */
    public AddressResolution resolveDerivedAddress(UUID treeId, UUID egoId, UUID targetId) {
        return resolveAddress(treeId, egoId, targetId, (ego, target) -> Optional.empty());
    }

    private AddressResolution resolveAddress(
            UUID treeId, UUID egoId, UUID targetId, AssertedLabelLookup assertedLabelLookup) {
        if (treeId == null) {
            return AddressResolution.unresolved(CanonicalResolution.noPath());
        }
        Optional<Tree> tree = treeRepository.findById(treeId);
        if (tree.isEmpty()) {
            return AddressResolution.unresolved(CanonicalResolution.noPath());
        }
        String region = tree.get().getRegion();

        KinshipGraphProjection projection = projectionCache.getProjection(treeId);

        Map<UUID, Person> peopleById = new HashMap<>();
        for (Person person : personRepository.findByTreeId(treeId)) {
            peopleById.put(person.getId(), person);
        }

        return resolve(
                region,
                projection,
                egoId,
                targetId,
                peopleById::get,
                (r, key) -> regionKinshipTermRepository
                        .findByRegionAndCanonicalRelation(r, key)
                        .map(RegionKinshipTerm::getTerm),
                assertedLabelLookup);
    }

    /**
     * Repository-backed {@link AssertedLabelLookup}: returns the stored label of the direct
     * {@code asserted} edge from {@code egoId} to {@code targetId} when one exists and is still in
     * the {@code asserted} derivation state, otherwise empty. An asserted edge that has been
     * upgraded (verified/conflict) is no longer surfaced as a stored label and falls through to
     * derived resolution. (Requirement 6.4)
     */
    private Optional<String> lookupAssertedLabel(UUID egoId, UUID targetId) {
        if (egoId == null || targetId == null) {
            return Optional.empty();
        }
        return relationshipRepository
                .findFirstBySourceIdAndTargetIdAndType(egoId, targetId, ASSERTED_TYPE)
                .filter(edge -> ASSERTED_STATE.equals(edge.getDerivationState()))
                .map(Relationship::getAssertedLabel);
    }

    /**
     * Derived-only core resolution (no asserted short-circuit), retained for callers and tests that
     * operate purely on a derived projection. Equivalent to
     * {@link #resolve(String, KinshipGraphProjection, UUID, UUID, Function, RegionTermLookup,
     * AssertedLabelLookup)} with an empty asserted-label lookup.
     */
    public AddressResolution resolve(
            String region,
            KinshipGraphProjection projection,
            UUID egoId,
            UUID targetId,
            Function<UUID, Person> personLookup,
            RegionTermLookup termLookup) {
        return resolve(region, projection, egoId, targetId, personLookup, termLookup,
                (ego, target) -> Optional.empty());
    }

    /**
     * Core, I/O-free resolution used by {@link #resolveAddress} and exercised directly in tests.
     *
     * <p>Resolution order (Requirement 6.4): a direct asserted edge between the ordered pair wins —
     * its stored label is returned verbatim as an {@link AddressResolution.Status#ASSERTED} result
     * and no derivation is attempted. Otherwise the canonical relation is derived, its key encoded,
     * and the region term looked up. Because the asserted lookup is keyed on this exact pair and the
     * projection already excludes asserted edges, an asserted edge never affects the address toward
     * any other person.
     *
     * @param region              the tree's region key ({@code Bac}/{@code Trung}/{@code Nam})
     * @param projection          the tree's kinship graph projection (derived edges only)
     * @param egoId               the viewpoint person
     * @param targetId            the person being addressed
     * @param personLookup        resolves a person id to its {@link Person} (gender / birth data)
     * @param termLookup          resolves {@code (region, canonicalKey)} to a dialect term
     * @param assertedLabelLookup resolves {@code (ego, target)} to a direct asserted edge's label
     * @return the region-aware address resolution
     */
    public AddressResolution resolve(
            String region,
            KinshipGraphProjection projection,
            UUID egoId,
            UUID targetId,
            Function<UUID, Person> personLookup,
            RegionTermLookup termLookup,
            AssertedLabelLookup assertedLabelLookup) {

        // (6.4) A direct asserted edge between this exact ordered pair returns its stored label
        // verbatim and is never traversed to derive other addresses.
        Optional<String> assertedLabel = assertedLabelLookup.label(egoId, targetId);
        if (assertedLabel.isPresent()) {
            return AddressResolution.asserted(assertedLabel.get());
        }

        CanonicalResolution canonical =
                resolver.resolveCanonical(projection, egoId, targetId, personLookup);

        // (8.5, 8.7) An unresolved path stays unresolved regardless of region.
        if (canonical.isUnresolved()) {
            return AddressResolution.unresolved(canonical);
        }

        String canonicalKey = canonical.relation().canonicalKey();
        Optional<String> term = termLookup.term(region, canonicalKey);

        // (9.3) Defined term for the tree's region; (9.4) otherwise undefined-for-region.
        return term.map(t -> AddressResolution.resolved(t, canonical))
                .orElseGet(() -> AddressResolution.undefinedForRegion(canonical));
    }
}
