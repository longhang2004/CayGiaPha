-- V5__tree_sharing_and_share_tokens.sql
-- Tree-level read-authorization and sharing (Requirement 19) plus the per-tree living-person
-- redaction toggle (Requirement 20.4).
--
--   * trees.sharing           — who may read the tree: private (default), link, or public. (19.1)
--   * trees.living_redaction  — whether Living_Person details are redacted for non-family. (20.4)
--   * tree_share_tokens       — unguessable share tokens for "link" sharing, hashed at rest. (19.4, 19.5)

ALTER TABLE trees
    ADD COLUMN sharing          text    NOT NULL DEFAULT 'private',
    ADD COLUMN living_redaction boolean NOT NULL DEFAULT true;

ALTER TABLE trees
    ADD CONSTRAINT chk_trees_sharing CHECK (sharing IN ('private', 'link', 'public'));

-- Share tokens for link-sharing. The plaintext token is shown to the owner once at creation; only
-- its hash is stored. A token is active while revoked_at IS NULL; at most one active token per tree
-- is enforced by the application (POST revokes the prior active token before issuing a new one).
CREATE TABLE tree_share_tokens (
    id         uuid        NOT NULL DEFAULT gen_random_uuid(),
    tree_id    uuid        NOT NULL,
    token_hash text        NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    revoked_at timestamptz,
    CONSTRAINT pk_tree_share_tokens PRIMARY KEY (id),
    CONSTRAINT fk_tree_share_tokens_tree FOREIGN KEY (tree_id) REFERENCES trees (id)
);

-- Direct lookup of a presented token by its hash (token has >=128 bits entropy, so an unsalted
-- SHA-256 is safe and enables an indexed lookup, unlike the salted per-row OTP hashing).
CREATE UNIQUE INDEX ux_tree_share_tokens_hash ON tree_share_tokens (token_hash);
CREATE INDEX ix_tree_share_tokens_tree ON tree_share_tokens (tree_id);
