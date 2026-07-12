ALTER TABLE collaboration_invitations
    ADD COLUMN IF NOT EXISTS source_invitation_id UUID NULL;

ALTER TABLE collaboration_invitations
    DROP CONSTRAINT IF EXISTS fk_collaboration_invitations_source;

ALTER TABLE collaboration_invitations
    ADD CONSTRAINT fk_collaboration_invitations_source
        FOREIGN KEY (source_invitation_id)
        REFERENCES collaboration_invitations(id)
        ON DELETE CASCADE;

DROP INDEX IF EXISTS ux_collaboration_pending_requester;

CREATE UNIQUE INDEX IF NOT EXISTS ux_collaboration_source_requester
    ON collaboration_invitations (source_invitation_id, requester_user_id)
    WHERE source_invitation_id IS NOT NULL
      AND requester_user_id IS NOT NULL;
