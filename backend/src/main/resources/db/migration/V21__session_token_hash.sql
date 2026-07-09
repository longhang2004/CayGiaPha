-- Store only a hash of the session cookie secret at rest.
-- Existing rows get a legacy hash of their id so dual-lookup can still resolve old UUID cookies
-- until they expire; new sessions use high-entropy opaque tokens.

ALTER TABLE sessions ADD COLUMN IF NOT EXISTS token_hash VARCHAR(64);

-- Placeholder unique hashes for existing rows (revoked or dual-lookup via id).
-- md5 is built-in; concatenated to 64 hex chars for uniqueness.
UPDATE sessions
SET token_hash = md5(id::text) || md5(id::text || 'session')
WHERE token_hash IS NULL;

ALTER TABLE sessions ALTER COLUMN token_hash SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS ux_sessions_token_hash ON sessions (token_hash);
