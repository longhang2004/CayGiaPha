package com.caygiapha.familytree.service;

import com.caygiapha.familytree.dto.ViewpointAddressesResponse;
import com.caygiapha.familytree.dto.ViewpointAddressesResponse.CanonicalDescriptor;
import com.caygiapha.familytree.dto.ViewpointAddressesResponse.TargetAddress;
import com.caygiapha.familytree.entity.Person;
import com.caygiapha.familytree.error.ApiException;
import com.caygiapha.familytree.repository.PersonRepository;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Computes the change-viewpoint all-addresses result: from a chosen ego (viewpoint), the address
 * toward every other person node in the tree (design: <em>Kinship_Resolver Algorithm —
 * Performance (8.1, 10.2)</em>; Requirement 10).
 *
 * <p>The computation:
 * <ol>
 *   <li>rejects a viewpoint node that is not in the tree, leaving the current viewpoint unchanged
 *       (10.4);</li>
 *   <li>loads the tree's persons once and obtains the cached kinship projection;</li>
 *   <li>delegates to {@link KinshipResolver#resolveAllFrom} which performs a <strong>single</strong>
 *       BFS from ego and derives every target's canonical relation from that one traversal (10.2);
 *       and</li>
 *   <li>maps each target to a resolved descriptor or the explicit unresolved indicator (10.3).</li>
 * </ol>
 *
 * <p>Region term lookup (task 3.7) is intentionally not performed here: the response carries the
 * region-agnostic {@link CanonicalDescriptor} (with its {@code canonicalKey}), which is the clean
 * seam for the region layer to attach the dialect term without changing this service's contract.
 */
@Service
public class ViewpointAddressService {

    private final PersonRepository personRepository;
    private final KinshipGraphProjectionCache projectionCache;
    private final KinshipResolver resolver;

    public ViewpointAddressService(
            PersonRepository personRepository,
            KinshipGraphProjectionCache projectionCache,
            KinshipResolver resolver) {
        this.personRepository = personRepository;
        this.projectionCache = projectionCache;
        this.resolver = resolver;
    }

    /**
     * Compute the address from {@code egoId} toward every other person node in {@code treeId}.
     *
     * @param treeId the tree to compute within
     * @param egoId  the selected viewpoint person
     * @return the per-target addresses (resolved descriptors or unresolved indicators)
     * @throws ApiException {@code NODE_NOT_ACCESSIBLE} when the ego is not a node in the tree (10.4)
     */
    @Transactional(readOnly = true)
    public ViewpointAddressesResponse computeAddresses(UUID treeId, UUID egoId) {
        // 10.4 — a viewpoint that is not a node in the tree is rejected; because nothing is mutated,
        // the caller's current viewpoint is left unchanged.
        if (treeId == null || egoId == null
                || !personRepository.existsByIdAndTreeId(egoId, treeId)) {
            throw ApiException.nodeNotAccessible(
                    "The selected viewpoint node is not in the tree.");
        }

        List<Person> persons = personRepository.findByTreeId(treeId);
        Map<UUID, Person> lookup = new HashMap<>(persons.size() * 2);
        for (Person person : persons) {
            lookup.put(person.getId(), person);
        }

        // Every OTHER person node is a target (10.1); ego addresses itself implicitly.
        List<UUID> targets = new ArrayList<>(persons.size());
        for (Person person : persons) {
            if (!person.getId().equals(egoId)) {
                targets.add(person.getId());
            }
        }

        KinshipGraphProjection projection = projectionCache.getProjection(treeId);
        Map<UUID, CanonicalResolution> resolutions =
                resolver.resolveAllFrom(projection, egoId, targets, lookup::get);

        List<TargetAddress> addresses = new ArrayList<>(targets.size());
        for (UUID targetId : targets) {
            CanonicalResolution resolution =
                    resolutions.getOrDefault(targetId, CanonicalResolution.noPath());
            addresses.add(toTargetAddress(targetId, resolution));
        }
        return new ViewpointAddressesResponse(egoId, addresses);
    }

    /** Map a resolution to its response entry: a descriptor, or the unresolved indicator (10.3). */
    private TargetAddress toTargetAddress(UUID targetId, CanonicalResolution resolution) {
        if (resolution.isResolved()) {
            return new TargetAddress(
                    targetId,
                    true,
                    resolution.status().name(),
                    null,
                    toDescriptor(resolution.relation()));
        }
        return new TargetAddress(
                targetId,
                false,
                resolution.status().name(),
                ViewpointAddressesResponse.UNRESOLVED_INDICATOR,
                null);
    }

    private CanonicalDescriptor toDescriptor(CanonicalRelation relation) {
        return new CanonicalDescriptor(
                relation.upCount(),
                relation.downCount(),
                relation.side().name(),
                relation.targetGender().name(),
                relation.branchOrder().name(),
                relation.spouseHop(),
                relation.canonicalKey());
    }
}
