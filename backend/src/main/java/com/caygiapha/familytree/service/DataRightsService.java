package com.caygiapha.familytree.service;

import com.caygiapha.familytree.dto.DataExportResponse;
import com.caygiapha.familytree.entity.Person;
import com.caygiapha.familytree.entity.Tree;
import com.caygiapha.familytree.error.ApiException;
import com.caygiapha.familytree.repository.ClaimRepository;
import com.caygiapha.familytree.repository.PersonRepository;
import com.caygiapha.familytree.repository.RelationshipRepository;
import com.caygiapha.familytree.repository.SessionRepository;
import com.caygiapha.familytree.repository.TreeRepository;
import com.caygiapha.familytree.repository.TreeShareTokenRepository;
import com.caygiapha.familytree.repository.UserConsentRepository;
import com.caygiapha.familytree.repository.UserRepository;
import com.caygiapha.familytree.repository.VerificationCodeRepository;
import com.caygiapha.familytree.security.AuthContext;
import com.caygiapha.familytree.security.AuthorizationService;
import java.util.List;
import java.util.UUID;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.stereotype.Service;

/**
 * Personal data rights for the subject of the data (Requirement 22): a claimed node's linked user
 * may export, correct (via the existing person edit path), or erase their node; a user may delete
 * their whole account. Every operation is <strong>subject-only</strong> — the linked user of the
 * node, or the account owner themselves — and is rejected otherwise (22.5).
 */
@Service
public class DataRightsService {

    /** Placeholder identifying fields are overwritten with when a node is anonymized. (22.3) */
    static final String ANONYMIZED_NAME = "(đã ẩn)";

    public enum EraseStrategy { DELETE, ANONYMIZE }

    private final PersonRepository personRepository;
    private final RelationshipRepository relationshipRepository;
    private final ClaimRepository claimRepository;
    private final TreeRepository treeRepository;
    private final TreeShareTokenRepository treeShareTokenRepository;
    private final SessionRepository sessionRepository;
    private final UserRepository userRepository;
    private final UserConsentRepository userConsentRepository;
    private final VerificationCodeRepository verificationCodeRepository;
    private final PersonDeletionService personDeletionService;
    private final ClaimService claimService;
    private final AuthorizationService authorizationService;

    public DataRightsService(
            PersonRepository personRepository,
            RelationshipRepository relationshipRepository,
            ClaimRepository claimRepository,
            TreeRepository treeRepository,
            TreeShareTokenRepository treeShareTokenRepository,
            SessionRepository sessionRepository,
            UserRepository userRepository,
            UserConsentRepository userConsentRepository,
            VerificationCodeRepository verificationCodeRepository,
            PersonDeletionService personDeletionService,
            ClaimService claimService,
            AuthorizationService authorizationService) {
        this.personRepository = personRepository;
        this.relationshipRepository = relationshipRepository;
        this.claimRepository = claimRepository;
        this.treeRepository = treeRepository;
        this.treeShareTokenRepository = treeShareTokenRepository;
        this.sessionRepository = sessionRepository;
        this.userRepository = userRepository;
        this.userConsentRepository = userConsentRepository;
        this.verificationCodeRepository = verificationCodeRepository;
        this.personDeletionService = personDeletionService;
        this.claimService = claimService;
        this.authorizationService = authorizationService;
    }

    /** Export the subject's node and its incident edges (22.1). Subject-only (22.5). */
    @Transactional(readOnly = true)
    public DataExportResponse exportNode(UUID personId) {
        Person person = requireSubjectNode(personId);
        return DataExportResponse.of(
                person, relationshipRepository.findBySourceIdOrTargetId(personId, personId));
    }

    /**
     * Erase the subject's node (22.3): {@code DELETE} removes it via neighbor-preservation (keeping
     * relatives), {@code ANONYMIZE} overwrites identifying fields and detaches the claim. The
     * authenticated user must be the node's linked user (22.5).
     */
    @Mutation
    public void eraseNode(UUID personId, EraseStrategy strategy) {
        Person person = requireSubjectNode(personId);
        if (strategy == EraseStrategy.DELETE) {
            personDeletionService.execute(person.getTreeId(), personId, "preserve");
        } else {
            person.setDisplayName(ANONYMIZED_NAME);
            person.setBirthOrder(null);
            person.setBirthYear(null);
            person.setAdoptionStatus(null);
            personRepository.save(person);
            claimRepository.deleteByPersonIdIn(List.of(personId)); // detach the linkage
        }
    }

    /**
     * Delete the authenticated user's account and the tree they own, terminating all their sessions
     * (Requirement 22.4). Returns the deleted user id for auditing.
     */
    @Mutation
    public UUID deleteAccount() {
        AuthContext context = authorizationService.requireAuthenticatedViewer();
        UUID userId = context.userId();

        treeRepository.findAllByOwnerUserIdOrderByCreatedAtAsc(userId).forEach(this::cascadeDeleteTree);

        // Remove the user's own claim linkages (on any tree), sessions, consents, and codes.
        claimRepository.deleteByUserId(userId);
        sessionRepository.deleteAll(sessionRepository.findByUserId(userId));
        userConsentRepository.deleteByUserId(userId);
        verificationCodeRepository.deleteByUserId(userId);
        userRepository.deleteById(userId);
        return userId;
    }

    /** Remove a whole tree: its share tokens, edges, claims/codes on its persons, persons, and the tree. */
    private void cascadeDeleteTree(Tree tree) {
        UUID treeId = tree.getId();
        treeShareTokenRepository.deleteByTreeId(treeId);
        relationshipRepository.deleteAll(relationshipRepository.findByTreeId(treeId));
        List<UUID> personIds = personRepository.findByTreeId(treeId).stream()
                .map(Person::getId).toList();
        if (!personIds.isEmpty()) {
            claimRepository.deleteByPersonIdIn(personIds);
            verificationCodeRepository.deleteByPersonIdIn(personIds);
        }
        personRepository.deleteAll(personRepository.findByTreeId(treeId));
        treeRepository.delete(tree);
    }

    /** Resolve the node and require the authenticated caller to be its linked {@code Claimed_Node} user. */
    private Person requireSubjectNode(UUID personId) {
        AuthContext context = authorizationService.requireAuthenticatedViewer();
        Person person = personRepository.findById(personId)
                .orElseThrow(() -> ApiException.nodeNotAccessible("The target node is not accessible."));
        if (!claimService.isLinkedUser(personId, context.userId())) {
            throw ApiException.notAuthorized(
                    "Only the person linked to this node may exercise data rights on it.");
        }
        return person;
    }
}
