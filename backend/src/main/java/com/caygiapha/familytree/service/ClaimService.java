package com.caygiapha.familytree.service;

import com.caygiapha.familytree.entity.Claim;
import com.caygiapha.familytree.entity.Person;
import com.caygiapha.familytree.entity.User;
import com.caygiapha.familytree.error.ApiException;
import com.caygiapha.familytree.repository.ClaimRepository;
import com.caygiapha.familytree.repository.PersonRepository;
import com.caygiapha.familytree.repository.UserRepository;
import java.util.Optional;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Verification_Service node-claiming orchestration: inviting a recipient to claim an unclaimed node
 * and verifying the claim code to link the node to the recipient's account
 * (Requirements 11.1, 11.2, 11.3, 11.6, 11.7).
 *
 * <p>This service composes the reusable primitives — {@link IdentifierValidator},
 * {@link VerificationCodeService}, {@link PersonRepository}, {@link UserRepository} — and persists
 * {@link Claim} links via {@link ClaimRepository}:
 *
 * <h2>Invite ({@link #invite})</h2>
 * <ol>
 *   <li>Require the target node is present in the caller's tree (11.1; {@code NODE_NOT_ACCESSIBLE}
 *       otherwise).</li>
 *   <li>Validate/classify the invited destination, naming the offending field on rejection.</li>
 *   <li>Reject an invitation for an already-claimed node with {@code ALREADY_CLAIMED} (11.7).</li>
 *   <li>Issue and deliver a 15-minute claim code bound to the node (11.1) via
 *       {@link VerificationCodeService#issueForNode}.</li>
 * </ol>
 *
 * <h2>Verify ({@link #verifyClaim})</h2>
 * <ol>
 *   <li>Require the target node is present in the caller's tree.</li>
 *   <li>Reject when the node is already claimed (11.7).</li>
 *   <li>Resolve the recipient's account from the submitted identifier
 *       ({@code ACCOUNT_NOT_FOUND} when none matches).</li>
 *   <li>Verify the submitted code (validity window / lockout enforced by
 *       {@link VerificationCodeService#verifyForNode}; 11.3, 11.4, 11.5). A wrong/expired code
 *       throws, so — because this method is a {@link Mutation} — no claim row is created and the
 *       node is left in its prior unclaimed state (11.3, 11.4).</li>
 *   <li>Create a {@code claims} row linking the node to the recipient's user (11.2).</li>
 * </ol>
 *
 * <h2>Linked-user edit permission (11.6)</h2>
 * {@link #isLinkedUser(UUID, UUID)} and {@link #findClaim(UUID)}/{@link #isClaimed(UUID)} expose the
 * claim linkage so the authorization layer (Tasks 7.1/7.3) and {@code PersonService} can permit a
 * claimed node to be edited by its linked user (in addition to the tree owner).
 *
 * <h2>Owner-identity assumption</h2>
 * Full authentication/authorization (resolving who the Owner is from the session) is Task 7.1. Here
 * the invited node's tree context is supplied explicitly by the caller via {@code treeId}, mirroring
 * the {@code PersonController} convention; Task 7.1 will replace this with the authenticated owner's
 * tree and enforce that only the owner may invite.
 */
@Service
public class ClaimService {

    private final ClaimRepository claimRepository;
    private final PersonRepository personRepository;
    private final UserRepository userRepository;
    private final IdentifierValidator identifierValidator;
    private final VerificationCodeService verificationCodeService;

    public ClaimService(
            ClaimRepository claimRepository,
            PersonRepository personRepository,
            UserRepository userRepository,
            IdentifierValidator identifierValidator,
            VerificationCodeService verificationCodeService) {
        this.claimRepository = claimRepository;
        this.personRepository = personRepository;
        this.userRepository = userRepository;
        this.identifierValidator = identifierValidator;
        this.verificationCodeService = verificationCodeService;
    }

    /**
     * Invite a phone/email to claim an unclaimed node, issuing a 15-minute claim code
     * (Requirements 11.1, 11.7).
     *
     * @param treeId      the tree the invited node belongs to
     * @param personId    the node being invited for claim
     * @param destination the phone/email the invitation code is delivered to
     * @throws ApiException {@code NODE_NOT_ACCESSIBLE} when the node is not in the tree;
     *     {@code VALIDATION_ERROR} when the destination is not a valid phone/email;
     *     {@code ALREADY_CLAIMED} when the node is already a {@code Claimed_Node} (11.7)
     */
    @Mutation
    public void invite(UUID treeId, UUID personId, String destination) {
        requirePerson(treeId, personId);
        identifierValidator.requireValid("destination", destination);
        if (claimRepository.existsByPersonId(personId)) {
            // 11.7 — cannot invite for a node that is already claimed.
            throw ApiException.alreadyClaimed("This node has already been claimed.");
        }
        // 11.1 — issue and deliver a claim code valid for 15 minutes.
        verificationCodeService.issueForNode(personId, destination);
    }

    /**
     * Verify a submitted claim code and, on success, link the node to the recipient's account
     * (Requirements 11.2, 11.3, 11.4, 11.5, 11.7).
     *
     * @param treeId     the tree the claimed node belongs to
     * @param personId   the node being claimed
     * @param identifier the recipient's phone/email whose account is linked
     * @param code       the submitted 6-digit verification code
     * @return the created {@link Claim} link
     * @throws ApiException {@code NODE_NOT_ACCESSIBLE} when the node is not in the tree;
     *     {@code ALREADY_CLAIMED} when the node is already claimed (11.7);
     *     {@code ACCOUNT_NOT_FOUND} when the identifier matches no account;
     *     {@code CODE_INVALID}/{@code CODE_EXPIRED}/{@code TOO_MANY_ATTEMPTS} from verification
     *     (11.3, 11.4, 11.5), leaving the node unclaimed
     */
    @Mutation
    public Claim verifyClaim(UUID treeId, UUID personId, String identifier, String code) {
        requirePerson(treeId, personId);
        if (claimRepository.existsByPersonId(personId)) {
            // 11.7 — the node has already been claimed; no second claim is possible.
            throw ApiException.alreadyClaimed("This node has already been claimed.");
        }

        IdentifierType type = identifierValidator.requireValid("identifier", identifier);
        User recipient = findByIdentifier(type, identifier)
                .orElseThrow(() -> ApiException.accountNotFound(
                        "No account was found for the provided identifier."));

        // 11.3 / 11.4 / 11.5 — wrong/expired/locked codes throw, rolling back the @Mutation so no
        // claim is created and the node stays in its prior unclaimed state.
        verificationCodeService.verifyForNode(personId, code);

        // 11.2 — mark the node a Claimed_Node linked to the recipient's account.
        return claimRepository.save(new Claim(personId, recipient.getId()));
    }

    /**
     * Whether the given user is the {@code Claimed_Node} user linked to the given person, used by
     * the authorization layer to permit linked-user edits (Requirement 11.6).
     */
    @Transactional(readOnly = true)
    public boolean isLinkedUser(UUID personId, UUID userId) {
        return personId != null
                && userId != null
                && claimRepository.existsByPersonIdAndUserId(personId, userId);
    }

    /** Whether the given person node is a {@code Claimed_Node} (Requirements 11.6, 11.7). */
    @Transactional(readOnly = true)
    public boolean isClaimed(UUID personId) {
        return personId != null && claimRepository.existsByPersonId(personId);
    }

    /**
     * Whether the given user is linked (via a {@code Claimed_Node}) to any node in the given tree,
     * used by the read-authorization layer to grant a non-owner family member read access to the
     * tree (Requirement 19.3).
     */
    @Transactional(readOnly = true)
    public boolean isLinkedToTree(UUID treeId, UUID userId) {
        return treeId != null && userId != null && claimRepository.existsLinkInTree(treeId, userId);
    }

    /** The claim linking the given node to a user, if any (Requirement 11.6). */
    @Transactional(readOnly = true)
    public Optional<Claim> findClaim(UUID personId) {
        if (personId == null) {
            return Optional.empty();
        }
        return claimRepository.findByPersonId(personId);
    }

    private Person requirePerson(UUID treeId, UUID personId) {
        if (treeId == null || personId == null) {
            throw ApiException.nodeNotAccessible("The target node is not accessible.");
        }
        return personRepository
                .findByIdAndTreeId(personId, treeId)
                .orElseThrow(() ->
                        ApiException.nodeNotAccessible("The target node is not accessible."));
    }

    private Optional<User> findByIdentifier(IdentifierType type, String identifier) {
        return type == IdentifierType.PHONE
                ? userRepository.findByPhone(identifier)
                : userRepository.findByEmail(identifier);
    }
}
