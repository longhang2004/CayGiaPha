package com.caygiapha.familytree.service;

import com.caygiapha.familytree.entity.LegalDocument;
import com.caygiapha.familytree.entity.UserConsent;
import com.caygiapha.familytree.error.ApiException;
import com.caygiapha.familytree.repository.LegalDocumentRepository;
import com.caygiapha.familytree.repository.UserConsentRepository;
import java.util.Optional;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Terms-of-Service / Privacy-Policy consent capture and checking (Requirement 23).
 *
 * <ul>
 *   <li>{@link #currentDocument} serves the current (highest-version) document (23.1).</li>
 *   <li>{@link #requireConsent} rejects sign-up verification unless both documents are accepted
 *       (23.3), naming the offending field so nothing is created.</li>
 *   <li>{@link #recordConsent} records acceptance of the current version of each document with a
 *       timestamp (23.2).</li>
 *   <li>{@link #hasCurrentConsent} reports whether a user has accepted the current version of both
 *       documents, the basis for requiring re-acceptance after a version bump (23.4).</li>
 * </ul>
 */
@Service
public class ConsentService {

    public static final String TOS = "tos";
    public static final String PRIVACY = "privacy";

    private final LegalDocumentRepository legalDocumentRepository;
    private final UserConsentRepository userConsentRepository;

    public ConsentService(
            LegalDocumentRepository legalDocumentRepository,
            UserConsentRepository userConsentRepository) {
        this.legalDocumentRepository = legalDocumentRepository;
        this.userConsentRepository = userConsentRepository;
    }

    /** The current document of the given type (23.1). */
    @Transactional(readOnly = true)
    public LegalDocument currentDocument(String docType) {
        return legalDocumentRepository
                .findFirstByDocTypeOrderByVersionDesc(docType)
                .orElseThrow(() -> ApiException.nodeNotAccessible(
                        "No " + docType + " document is published."));
    }

    /**
     * Reject sign-up verification unless both the Terms of Service and Privacy Policy are accepted
     * (23.3). Throws {@code VALIDATION_ERROR} naming the first un-accepted document so the caller
     * creates nothing.
     */
    public void requireConsent(boolean acceptedTos, boolean acceptedPrivacy) {
        if (!acceptedTos) {
            throw ApiException.validation(
                    "acceptedTos", "You must accept the Terms of Service to sign up.");
        }
        if (!acceptedPrivacy) {
            throw ApiException.validation(
                    "acceptedPrivacy", "You must accept the Privacy Policy to sign up.");
        }
    }

    /** Record the user's acceptance of the current version of both documents (23.2). */
    @Transactional
    public void recordConsent(UUID userId) {
        recordOne(userId, TOS);
        recordOne(userId, PRIVACY);
    }

    private void recordOne(UUID userId, String docType) {
        int version = currentDocument(docType).getVersion();
        userConsentRepository.save(new UserConsent(userId, docType, version));
    }

    /**
     * Whether the user has accepted the current version of both documents; {@code false} when a
     * newer version has been published since their last acceptance (the trigger for re-acceptance,
     * 23.4).
     */
    @Transactional(readOnly = true)
    public boolean hasCurrentConsent(UUID userId) {
        return acceptedCurrent(userId, TOS) && acceptedCurrent(userId, PRIVACY);
    }

    private boolean acceptedCurrent(UUID userId, String docType) {
        int current = currentDocument(docType).getVersion();
        Optional<UserConsent> latest =
                userConsentRepository.findFirstByUserIdAndDocTypeOrderByVersionDesc(userId, docType);
        return latest.map(c -> c.getVersion() >= current).orElse(false);
    }

    /**
     * Whether the user must re-accept before their next data-mutating operation (Requirement 23.4):
     * {@code true} only when the user has a <em>prior</em> consent record that is now behind the
     * current version of either document. A user with no consent record at all is not blocked here
     * (account creation already requires consent; this gate concerns version bumps after the fact),
     * which also keeps it inert for contexts that never recorded consent.
     */
    @Transactional(readOnly = true)
    public boolean needsReacceptance(UUID userId) {
        if (userId == null) {
            return false;
        }
        return staleButPresent(userId, TOS) || staleButPresent(userId, PRIVACY);
    }

    private boolean staleButPresent(UUID userId, String docType) {
        Optional<UserConsent> latest =
                userConsentRepository.findFirstByUserIdAndDocTypeOrderByVersionDesc(userId, docType);
        if (latest.isEmpty()) {
            return false; // no record → not blocked by the re-acceptance gate.
        }
        return latest.get().getVersion() < currentDocument(docType).getVersion();
    }
}
