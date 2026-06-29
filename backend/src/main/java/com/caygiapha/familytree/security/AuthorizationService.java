package com.caygiapha.familytree.security;

import com.caygiapha.familytree.error.ApiException;
import com.caygiapha.familytree.entity.Tree;
import com.caygiapha.familytree.repository.TreeRepository;
import com.caygiapha.familytree.repository.TreeCollaboratorRepository;
import com.caygiapha.familytree.service.ClaimService;
import com.caygiapha.familytree.service.ConsentService;
import com.caygiapha.familytree.service.ShareTokenService;
import java.util.Optional;
import java.util.UUID;
import org.springframework.stereotype.Service;

/**
 * Realizes the mutation-authorization model of the {@code Graph_Store} (design "Graph_Store —
 * Enforces authorization"; Property 18; Requirements 11.6, 13.4, 13.5).
 */
@Service
public class AuthorizationService {

    /** Caller classification relative to a specific target tree/person. */
    public enum Role {
        /** Owns the target tree; may mutate anything within it (13.4). */
        OWNER,
        /** Contributes to the target tree. */
        CONTRIBUTOR,
        /** Linked user of the target {@code Claimed_Node}; may edit that node (11.6). */
        LINKED_CLAIMED_USER,
        /** Neither owner nor linked user; all mutations rejected (13.5). */
        NEITHER
    }

    private final AuthContextHolder authContextHolder;
    private final ClaimService claimService;
    private final TreeRepository treeRepository;
    private final TreeCollaboratorRepository collaboratorRepository;
    private final ShareTokenService shareTokenService;
    private final ConsentService consentService;

    public AuthorizationService(
            AuthContextHolder authContextHolder,
            ClaimService claimService,
            TreeRepository treeRepository,
            TreeCollaboratorRepository collaboratorRepository,
            ShareTokenService shareTokenService,
            ConsentService consentService) {
        this.authContextHolder = authContextHolder;
        this.claimService = claimService;
        this.treeRepository = treeRepository;
        this.collaboratorRepository = collaboratorRepository;
        this.shareTokenService = shareTokenService;
        this.consentService = consentService;
    }

    /** The authenticated principal bound to the current request. */
    public AuthContext currentContext() {
        return authContextHolder.current();
    }

    /**
     * Classify the current caller relative to the given target (Property 18).
     *
     * @param targetTreeId   the tree the mutation targets (may be {@code null})
     * @param targetPersonId the person the mutation targets, when node-scoped (may be {@code null})
     * @return the caller's {@link Role}
     */
    public Role classify(UUID targetTreeId, UUID targetPersonId) {
        AuthContext context = authContextHolder.current();
        if (!context.isAuthenticated()) {
            return Role.NEITHER;
        }
        // OWNER: a user owns at most one tree (13.2), so owning the target tree is an id match.
        boolean ownsTargetTree = targetTreeId != null
                && context.ownedTreeId().map(targetTreeId::equals).orElse(false);
        if (ownsTargetTree) {
            return Role.OWNER;
        }
        // CONTRIBUTOR: check if the user is a registered collaborator for the target tree.
        if (targetTreeId != null
                && collaboratorRepository.existsByTreeIdAndUserId(targetTreeId, context.userId())) {
            return Role.CONTRIBUTOR;
        }
        // LINKED_CLAIMED_USER: the target node is claimed by, and linked to, this user (11.6).
        if (targetPersonId != null
                && claimService.isLinkedUser(targetPersonId, context.userId())) {
            return Role.LINKED_CLAIMED_USER;
        }
        return Role.NEITHER;
    }

    /**
     * Enforce that the current caller may perform a mutation on the given target, rejecting a
     * {@link Role#NEITHER} caller with {@code NOT_AUTHORIZED} (13.5).
     *
     * @param targetTreeId   the tree the mutation targets
     * @param targetPersonId the person the mutation targets, when node-scoped (may be {@code null})
     * @throws ApiException {@code NOT_AUTHORIZED} when the caller is neither owner nor linked user
     */
    public void requireMutationPermitted(UUID targetTreeId, UUID targetPersonId) {
        if (classify(targetTreeId, targetPersonId) == Role.NEITHER) {
            throw ApiException.notAuthorized(
                    "You are not authorized to modify this tree's contents.");
        }
        requireCurrentConsent(); // 23.4
    }

    /**
     * Enforce that the current caller owns the given tree (owner-only operations such as creating a
     * relationship or sending a claim invitation; 13.4).
     *
     * @throws ApiException {@code NOT_AUTHORIZED} when the caller does not own the target tree
     */
    public void requireOwner(UUID targetTreeId) {
        if (classify(targetTreeId, null) != Role.OWNER) {
            throw ApiException.notAuthorized(
                    "Only the tree owner may perform this operation.");
        }
        requireCurrentConsent(); // 23.4
    }

    /**
     * Enforce the Requirement 23.4 re-acceptance gate: a caller whose stored consent is behind the
     * current Terms/Privacy version must re-accept before any data-mutating operation. A caller with
     * current consent (or no prior consent record) passes.
     */
    private void requireCurrentConsent() {
        UUID userId = authContextHolder.current().userId();
        if (userId != null && consentService.needsReacceptance(userId)) {
            throw ApiException.consentRequired(
                    "Please re-accept the updated Terms of Service and Privacy Policy to continue.");
        }
    }

    /**
     * Resolve the tree owned by the authenticated caller, used by owner-only create operations that
     * derive the acting tree from the session rather than trusting a request-body {@code treeId}.
     *
     * @return the authenticated owner's tree id
     * @throws ApiException {@code NOT_AUTHORIZED} when the caller is unauthenticated or owns no tree
     */
    public UUID requireOwnedTreeId() {
        AuthContext context = authContextHolder.current();
        if (!context.isAuthenticated()) {
            throw ApiException.notAuthorized("Authentication is required for this operation.");
        }
        return context.ownedTreeId()
                .orElseThrow(() -> ApiException.notAuthorized(
                        "You do not own a tree to perform this operation on."));
    }

    /**
     * Enforce that the request carries an authenticated viewer, used by read endpoints that require
     * a session but are not restricted to the tree owner (e.g. the change-viewpoint all-addresses
     * read; task 3.12). Tree-scope validation is handled by the read itself (a node absent from the
     * tree is rejected as {@code NODE_NOT_ACCESSIBLE}).
     *
     * @return the authenticated caller's context
     * @throws ApiException {@code NOT_AUTHORIZED} when the request is unauthenticated
     */
    public AuthContext requireAuthenticatedViewer() {
        AuthContext context = authContextHolder.current();
        if (!context.isAuthenticated()) {
            throw ApiException.notAuthorized("Authentication is required to view this tree.");
        }
        return context;
    }

    /**
     * Enforce tree-level read access (Requirement 19). Throws a uniform {@code NOT_AUTHORIZED} that
     * does not reveal whether the tree exists when access is denied (19.7, 25.4).
     *
     * @param treeId     the tree being read
     * @param shareToken the value of the {@code X-Share-Token} header, or {@code null} when absent
     */
    public void requireReadAccess(UUID treeId, String shareToken) {
        if (!hasReadAccess(treeId, shareToken)) {
            throw ApiException.notAuthorized("You are not authorized to view this tree.");
        }
    }

    /**
     * Whether the current caller may read the given tree under the sharing model (Requirement 19):
     * <ul>
     *   <li>every read requires an authenticated session (19.2);</li>
     *   <li>the tree Owner and any User linked to a {@code Claimed_Node} in the tree may always read
     *       (19.3);</li>
     *   <li>{@code public} trees are readable by any authenticated user (19.6);</li>
     *   <li>{@code link} trees are additionally readable by a caller presenting a valid, non-revoked
     *       share token for that tree (19.4);</li>
     *   <li>{@code private} trees are readable only by the owner/linked users above (19.3).</li>
     * </ul>
     * A non-existent tree yields {@code false} (no access), so denials never reveal tree existence.
     */
    public boolean hasReadAccess(UUID treeId, String shareToken) {
        AuthContext context = authContextHolder.current();
        if (!context.isAuthenticated() || treeId == null) {
            return false; // 19.2 — reads require authentication.
        }
        // Owner or a linked family member of this tree always has read access (19.3).
        if (context.ownedTreeId().map(treeId::equals).orElse(false)
                || claimService.isLinkedToTree(treeId, context.userId())) {
            return true;
        }
        Optional<Tree> tree = treeRepository.findById(treeId);
        if (tree.isEmpty()) {
            return false; // unknown tree — uniform denial (19.7, 25.4).
        }
        String sharing = tree.get().getSharing();
        if (Tree.DEFAULT_SHARING.equals(sharing)) { // 'private' (19.3)
            return false;
        }
        if ("public".equals(sharing)) { // 19.6 — any authenticated user.
            return true;
        }
        // 'link' (19.4) — a valid, non-revoked token for this specific tree grants access.
        return shareTokenService.resolveTreeId(shareToken).map(treeId::equals).orElse(false);
    }
}
