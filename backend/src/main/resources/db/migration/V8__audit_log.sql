-- V8__audit_log.sql
-- Append-only audit log of security-relevant events (Requirement 25.2, 25.3): authentication
-- events, sharing/visibility changes, data-rights operations, and person deletions. Records the
-- actor, action, target, an optional non-sensitive detail, and a timestamp. Verification codes,
-- session tokens, and share tokens are never written here (25.3) — enforced by the callers.

CREATE TABLE audit_log (
    id            uuid        NOT NULL DEFAULT gen_random_uuid(),
    actor_user_id uuid,
    action        text        NOT NULL,
    target_type   text,
    target_id     uuid,
    detail        text,
    created_at    timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT pk_audit_log PRIMARY KEY (id)
);

CREATE INDEX ix_audit_log_actor ON audit_log (actor_user_id);
CREATE INDEX ix_audit_log_created_at ON audit_log (created_at);
