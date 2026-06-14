package com.caygiapha.familytree.service;

import com.caygiapha.familytree.entity.Relationship;
import com.caygiapha.familytree.error.ApiException;
import com.caygiapha.familytree.repository.PersonRepository;
import com.caygiapha.familytree.repository.RelationshipRepository;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

/**
 * Graph_Store edge-creation logic: creates typed {@link Relationship} edges and enforces the
 * structural invariants of the relationship graph model (Requirements 4.1, 4.2, 4.4, 4.5, 4.6,
 * 4.7, 4.8, 5.5, 6.1, 6.2, 12.1, 12.2).
 *
 * <p>Validation performed on every create request, in order:
 * <ol>
 *   <li>the edge {@code type} is one of the five supported discriminators;</li>
 *   <li>source and target are distinct — a self-referencing edge is rejected (4.1, 4.2);</li>
 *   <li>both endpoints already exist within the request's tree (4.8, 5.5);</li>
 *   <li>type-specific rules: at-most-one father / mother per child (4.4), the marital-status
 *       enum for marriage (4.5), the social-type enum for non-bloodline (4.6, 12.1, 12.2), and
 *       the asserted-label length 1-50 (4.7, 6.1, 6.2).</li>
 * </ol>
 *
 * <p><strong>Cycle prevention (Requirement 4.9)</strong> is enforced in the bloodline branch via
 * {@link #validateBloodlineEdge}: before a parent -> child edge is stored, a recursive
 * reachability walk over the existing bloodline edges rejects it if the child is already an
 * ancestor of the parent.
 */
@Service
public class RelationshipService {

    static final String TYPE_BLOODLINE_FATHER = "bloodline_father";
    static final String TYPE_BLOODLINE_MOTHER = "bloodline_mother";
    static final String TYPE_MARRIAGE = "marriage";
    static final String TYPE_NON_BLOODLINE = "non_bloodline";
    static final String TYPE_ASSERTED = "asserted";

    private static final Set<String> KNOWN_TYPES = Set.of(
            TYPE_BLOODLINE_FATHER, TYPE_BLOODLINE_MOTHER, TYPE_MARRIAGE, TYPE_NON_BLOODLINE,
            TYPE_ASSERTED);

    private static final Set<String> BLOODLINE_TYPES = Set.of(
            TYPE_BLOODLINE_FATHER, TYPE_BLOODLINE_MOTHER);

    private static final Set<String> MARITAL_STATUSES = Set.of("married", "divorced", "deceased");
    private static final Set<String> SOCIAL_TYPES = Set.of("friend", "teacher", "colleague");

    private static final int ASSERTED_LABEL_MIN = 1;
    private static final int ASSERTED_LABEL_MAX = 50;

    private final RelationshipRepository relationshipRepository;
    private final PersonRepository personRepository;
    private final KinshipGraphProjectionCache projectionCache;
    private final AssertedUpgradeService assertedUpgradeService;

    /**
     * Primary (Spring) constructor wiring the asserted-upgrade scan
     * ({@link AssertedUpgradeService}) that runs after a bloodline edge is created (Requirement 7).
     */
    @Autowired
    public RelationshipService(RelationshipRepository relationshipRepository,
            PersonRepository personRepository,
            KinshipGraphProjectionCache projectionCache,
            AssertedUpgradeService assertedUpgradeService) {
        this.relationshipRepository = relationshipRepository;
        this.personRepository = personRepository;
        this.projectionCache = projectionCache;
        this.assertedUpgradeService = assertedUpgradeService;
    }

    /**
     * Convenience constructor without the asserted-upgrade scan, retained for focused unit tests of
     * the structural edge-creation invariants. With no scanner wired, {@link #create} performs no
     * upgrade scan and reports no conflicts.
     */
    public RelationshipService(RelationshipRepository relationshipRepository,
            PersonRepository personRepository,
            KinshipGraphProjectionCache projectionCache) {
        this(relationshipRepository, personRepository, projectionCache, null);
    }

    /**
     * Create a typed edge in the given tree after enforcing all structural constraints.
     *
     * <p>The whole operation is a single transaction ({@link Mutation}); any rejection throws an
     * {@link ApiException} and persists nothing, satisfying the "SHALL NOT create" criteria.
     *
     * @param command the validated edge-creation command
     * @return the persisted {@link Relationship}
     */
    @Mutation
    public Relationship createRelationship(CreateRelationshipCommand command) {
        return create(command).edge();
    }

    /**
     * Create a typed edge and, when the edge is a {@code Primitive_Bloodline_Edge}, run the
     * asserted-upgrade and conflict-detection scan (Requirement 7) over the tree.
     *
     * <p>Adding a bloodline edge can complete an unbroken bloodline path between a pair previously
     * joined only by an {@code Asserted_Relationship}; the scan upgrades each such edge to
     * {@code verified} (term matches the label) or {@code conflict} (term differs), returning any
     * conflict warnings — each carrying both the asserted label and the derived term — alongside the
     * created edge. Non-bloodline edge creation cannot complete a bloodline path, so the scan is
     * skipped. The whole operation is a single transaction.
     *
     * @param command the validated edge-creation command
     * @return the persisted edge together with any conflict warnings the upgrade scan produced
     */
    @Mutation
    public RelationshipMutationResult create(CreateRelationshipCommand command) {
        String type = command.type();
        if (type == null || !KNOWN_TYPES.contains(type)) {
            throw ApiException.validation("type",
                    "Relationship type must be one of bloodline_father, bloodline_mother, "
                            + "marriage, non_bloodline, asserted.");
        }

        UUID treeId = command.treeId();
        UUID sourceId = command.sourceId();
        UUID targetId = command.targetId();

        // (4.1, 4.2) An edge connects two distinct nodes.
        if (sourceId.equals(targetId)) {
            throw ApiException.selfReference("Source and target must be different persons.");
        }

        // (4.8, 5.5) Both referenced nodes must exist within the tree.
        requireExistingNode(treeId, sourceId, "sourceId");
        requireExistingNode(treeId, targetId, "targetId");

        Relationship edge = new Relationship(treeId, type, sourceId, targetId);

        switch (type) {
            case TYPE_BLOODLINE_FATHER, TYPE_BLOODLINE_MOTHER ->
                    validateBloodlineEdge(type, sourceId, targetId);
            case TYPE_MARRIAGE -> applyMarriage(edge, command.maritalStatus());
            case TYPE_NON_BLOODLINE -> applyNonBloodline(edge, command.socialType());
            case TYPE_ASSERTED -> applyAsserted(edge, command.assertedLabel());
            default -> throw new IllegalStateException("Unreachable type: " + type);
        }

        Relationship saved = relationshipRepository.save(edge);

        // Any new edge can change derived connectivity, so invalidate the tree's cached kinship
        // graph projection; the next resolve rebuilds it from the current graph.
        projectionCache.evict(treeId);

        // (7.1) Only a new bloodline edge can complete an unbroken bloodline path between a pair
        // previously joined by an asserted relationship; run the upgrade/conflict scan for those.
        List<ConflictWarning> conflicts = List.of();
        if (assertedUpgradeService != null && BLOODLINE_TYPES.contains(type)) {
            conflicts = assertedUpgradeService.scanForUpgrades(treeId);
        }

        return new RelationshipMutationResult(saved, conflicts);
    }

    private void requireExistingNode(UUID treeId, UUID personId, String field) {
        if (!personRepository.existsByIdAndTreeId(personId, treeId)) {
            throw ApiException.missingNode(field,
                    "Referenced person " + personId + " was not found in the tree.");
        }
    }

    /**
     * Bloodline (father-child / mother-child) edge checks. {@code parentId} is the source and
     * {@code childId} is the target; Requirement 4.4 restricts each child to at most one father
     * and one mother edge, and Requirement 4.9 forbids edges that would introduce a parent-child
     * cycle.
     */
    private void validateBloodlineEdge(String type, UUID parentId, UUID childId) {
        if (relationshipRepository.existsByTargetIdAndType(childId, type)) {
            String parent = TYPE_BLOODLINE_FATHER.equals(type) ? "father" : "mother";
            throw ApiException.parentLimit(
                    "Child " + childId + " already has a " + parent + " bloodline edge.");
        }

        // (4.9) Reject the edge if the proposed child is already an ancestor of the proposed
        // parent — adding parent -> child would then close a parent-child cycle. We discover this
        // by walking the existing bloodline edges upward from the parent: if the child is reached,
        // it is an ancestor of the parent.
        if (isBloodlineAncestor(childId, parentId)) {
            throw ApiException.cycleViolation(
                    "Adding this bloodline edge would create a parent-child cycle: "
                            + childId + " is already an ancestor of " + parentId + ".");
        }
    }

    /**
     * Recursive reachability check over the stored bloodline edges (Requirement 4.9): returns
     * {@code true} when {@code candidateAncestorId} is reachable by walking parent edges upward
     * from {@code startId} (i.e. it is an ancestor of, or equal to, {@code startId}).
     *
     * <p>Bloodline edges are directed parent ({@code source}) -> child ({@code target}); the
     * parents of a node are therefore the sources of its incoming bloodline edges. A visited set
     * guards against any pre-existing cycles so the walk always terminates.
     */
    private boolean isBloodlineAncestor(UUID candidateAncestorId, UUID startId) {
        Set<UUID> visited = new HashSet<>();
        Deque<UUID> frontier = new ArrayDeque<>();
        frontier.push(startId);
        while (!frontier.isEmpty()) {
            UUID current = frontier.pop();
            if (current.equals(candidateAncestorId)) {
                return true;
            }
            if (!visited.add(current)) {
                continue;
            }
            for (Relationship parentEdge : relationshipRepository.findByTargetId(current)) {
                if (BLOODLINE_TYPES.contains(parentEdge.getType())) {
                    frontier.push(parentEdge.getSourceId());
                }
            }
        }
        return false;
    }

    private void applyMarriage(Relationship edge, String maritalStatus) {
        if (maritalStatus == null || !MARITAL_STATUSES.contains(maritalStatus)) {
            throw ApiException.validation("maritalStatus",
                    "Marital status must be one of married, divorced, deceased.");
        }
        edge.setMaritalStatus(maritalStatus);
    }

    private void applyNonBloodline(Relationship edge, String socialType) {
        if (socialType == null || !SOCIAL_TYPES.contains(socialType)) {
            throw ApiException.validation("socialType",
                    "Social type must be one of friend, teacher, colleague.");
        }
        edge.setSocialType(socialType);
    }

    private void applyAsserted(Relationship edge, String assertedLabel) {
        if (assertedLabel == null
                || assertedLabel.length() < ASSERTED_LABEL_MIN
                || assertedLabel.length() > ASSERTED_LABEL_MAX) {
            throw ApiException.validation("assertedLabel",
                    "Asserted label must be 1 to 50 characters.");
        }
        edge.setAssertedLabel(assertedLabel);
        // Asserted edges are opaque until intermediate nodes complete a path (Requirement 6.x).
        edge.setDerivationState("asserted");
    }

    /**
     * Immutable command describing an edge-creation request, decoupled from the web DTO so the
     * service is independently testable. Type-specific fields are {@code null} unless relevant to
     * {@link #type()}.
     */
    public record CreateRelationshipCommand(
            UUID treeId,
            String type,
            UUID sourceId,
            UUID targetId,
            String maritalStatus,
            String socialType,
            String assertedLabel) {
    }

    /**
     * The outcome of an edge-creation mutation: the persisted edge plus any conflict warnings
     * raised by the asserted-upgrade scan (Requirement 7.5). {@code conflicts} is empty for
     * non-bloodline edges and for bloodline edges that completed no asserted pair, or that upgraded
     * only matching ({@code verified}) pairs.
     *
     * @param edge      the persisted relationship edge
     * @param conflicts conflict warnings, each carrying the asserted label and the derived term
     */
    public record RelationshipMutationResult(Relationship edge, List<ConflictWarning> conflicts) {
        public RelationshipMutationResult {
            conflicts = conflicts == null ? List.of() : List.copyOf(conflicts);
        }
    }
}
