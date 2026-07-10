-- V15 created collaborator/invitation PKs without a default UUID generator.
-- Drizzle inserts use DEFAULT for id; without gen_random_uuid() Postgres rejects the row.
ALTER TABLE tree_collaborators
    ALTER COLUMN id SET DEFAULT gen_random_uuid();

ALTER TABLE collaboration_invitations
    ALTER COLUMN id SET DEFAULT gen_random_uuid();
