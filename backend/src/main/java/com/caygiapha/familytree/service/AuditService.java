package com.caygiapha.familytree.service;

import com.caygiapha.familytree.entity.AuditLog;
import com.caygiapha.familytree.repository.AuditLogRepository;
import com.caygiapha.familytree.security.AuthContextHolder;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Records security-relevant events to the append-only {@code audit_log} (Requirement 25.2). The
 * actor is resolved from the current {@link AuthContextHolder} so callers need only name the action
 * and target. Callers must pass only non-sensitive {@code detail} — verification codes, session
 * tokens, and share tokens must never be logged (25.3).
 */
@Service
public class AuditService {

    // Action names (stable, lowercase, dot-namespaced).
    public static final String SIGN_IN = "auth.sign_in";
    public static final String SIGN_OUT = "auth.sign_out";
    public static final String SIGN_UP_VERIFIED = "auth.sign_up_verified";
    public static final String SHARING_CHANGED = "tree.sharing_changed";
    public static final String LIVING_REDACTION_CHANGED = "tree.living_redaction_changed";
    public static final String SHARE_TOKEN_ISSUED = "tree.share_token_issued";
    public static final String SHARE_TOKEN_REVOKED = "tree.share_token_revoked";
    public static final String VISIBILITY_CHANGED = "person.visibility_changed";
    public static final String PERSON_DELETED = "person.deleted";
    public static final String DATA_EXPORTED = "rights.data_exported";
    public static final String NODE_ERASED = "rights.node_erased";
    public static final String ACCOUNT_DELETED = "rights.account_deleted";
    public static final String FEEDBACK_SUBMITTED = "feedback.submitted";
    public static final String FEEDBACK_STATUS_CHANGED = "feedback.status_changed";
    public static final String SENSITIVE_READ = "privacy.sensitive_read";

    private final AuditLogRepository auditLogRepository;
    private final AuthContextHolder authContextHolder;

    public AuditService(
            AuditLogRepository auditLogRepository, AuthContextHolder authContextHolder) {
        this.auditLogRepository = auditLogRepository;
        this.authContextHolder = authContextHolder;
    }

    /** Record an event for the current actor (resolved from the auth context). */
    @Transactional
    public void record(String action, String targetType, UUID targetId, String detail) {
        UUID actor = authContextHolder.current().userId();
        auditLogRepository.save(new AuditLog(actor, action, targetType, targetId, detail));
    }

    /** Record an event with no extra detail. */
    public void record(String action, String targetType, UUID targetId) {
        record(action, targetType, targetId, null);
    }

    /** Record an event for an explicit actor (used when the context actor is being removed). */
    @Transactional
    public void recordAs(UUID actor, String action, String targetType, UUID targetId, String detail) {
        auditLogRepository.save(new AuditLog(actor, action, targetType, targetId, detail));
    }
}
