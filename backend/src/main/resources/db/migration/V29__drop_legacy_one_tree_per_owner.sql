-- V1 created CONSTRAINT uq_trees_owner UNIQUE (owner_user_id).
-- V16 intended to allow multiple trees per owner but only dropped
-- trees_owner_user_id_key / trees_owner_user_id_unique, so databases
-- migrated from V1 still reject a second tree (HTTP 500 on POST /api/v1/trees).
-- Requirement 13.2: signup still reuses the first tree; additional trees are
-- created explicitly via POST /api/v1/trees.

ALTER TABLE trees DROP CONSTRAINT IF EXISTS uq_trees_owner;
ALTER TABLE trees DROP CONSTRAINT IF EXISTS trees_owner_user_id_key;
ALTER TABLE trees DROP CONSTRAINT IF EXISTS trees_owner_user_id_unique;
DROP INDEX IF EXISTS trees_owner_user_id_key;
DROP INDEX IF EXISTS trees_owner_user_id_unique_idx;
DROP INDEX IF EXISTS uq_trees_owner;
