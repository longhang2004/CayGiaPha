-- Expand collaboration invite codes to hold high-entropy tokens (~128 bits).
ALTER TABLE collaboration_invitations
    ALTER COLUMN code TYPE VARCHAR(64);
