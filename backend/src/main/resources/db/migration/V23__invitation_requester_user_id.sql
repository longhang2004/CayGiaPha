-- Track who requested a pending generic-code join (phone-only accounts included).
ALTER TABLE collaboration_invitations
    ADD COLUMN IF NOT EXISTS requester_user_id UUID NULL;

ALTER TABLE collaboration_invitations
    DROP CONSTRAINT IF EXISTS fk_collaboration_invitations_requester;

ALTER TABLE collaboration_invitations
    ADD CONSTRAINT fk_collaboration_invitations_requester
        FOREIGN KEY (requester_user_id) REFERENCES users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS ix_collaboration_invitations_requester
    ON collaboration_invitations (requester_user_id)
    WHERE requester_user_id IS NOT NULL;
