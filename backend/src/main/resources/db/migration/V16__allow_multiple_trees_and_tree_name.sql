-- Remove unique constraint/index on owner_user_id to allow multiple trees per owner
ALTER TABLE trees DROP CONSTRAINT IF EXISTS trees_owner_user_id_key;
ALTER TABLE trees DROP CONSTRAINT IF EXISTS trees_owner_user_id_unique;
DROP INDEX IF EXISTS trees_owner_user_id_key;
DROP INDEX IF EXISTS trees_owner_user_id_unique_idx;

-- Add name column to trees table
ALTER TABLE trees ADD COLUMN name VARCHAR(255) NOT NULL DEFAULT 'Cây Gia Phả';
