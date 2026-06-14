-- V1__initial_schema.sql
-- Initial PostgreSQL schema for the Vietnamese Family Tree (Cay Gia Pha) system.
--
-- Implements the design "Data Models" section: users, sessions, trees, persons,
-- relationships (typed-edge table), claims, verification_codes, and region_kinship_terms.
--
-- Notes:
--   * uuid primary keys default to gen_random_uuid() (built into PostgreSQL >= 13 / core, 16 here).
--   * Flyway owns the schema; Hibernate runs with ddl-auto=validate.
--   * Enumerated text domains are enforced with CHECK constraints.
--   * The birth_year upper bound (<= current calendar year) is enforced in the application layer
--     because "current year" is not an immutable expression usable in a CHECK constraint; the
--     immutable lower bound (>= 1000) is enforced here.

-- ============================================================================
-- users  (Requirements 1.x, 2.x, 13.1)
-- ============================================================================
CREATE TABLE users (
    id         uuid        NOT NULL DEFAULT gen_random_uuid(),
    phone      text,
    email      text,
    verified   boolean     NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT pk_users PRIMARY KEY (id),
    -- At least one identifier (phone or email) must be present.
    CONSTRAINT chk_users_identifier CHECK (phone IS NOT NULL OR email IS NOT NULL)
);

-- Partial unique indexes: an identifier is unique among non-null values.
CREATE UNIQUE INDEX ux_users_phone ON users (phone) WHERE phone IS NOT NULL;
CREATE UNIQUE INDEX ux_users_email ON users (email) WHERE email IS NOT NULL;

-- ============================================================================
-- sessions  (Requirements 2.3, 2.8)
-- ============================================================================
CREATE TABLE sessions (
    id         uuid        NOT NULL DEFAULT gen_random_uuid(),
    user_id    uuid        NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    expires_at timestamptz NOT NULL,
    revoked    boolean     NOT NULL DEFAULT false,
    CONSTRAINT pk_sessions PRIMARY KEY (id),
    CONSTRAINT fk_sessions_user FOREIGN KEY (user_id) REFERENCES users (id)
);

CREATE INDEX ix_sessions_user_id ON sessions (user_id);

-- ============================================================================
-- trees  (Requirements 9.1, 9.2, 13.1, 13.2)
-- ============================================================================
CREATE TABLE trees (
    id            uuid        NOT NULL DEFAULT gen_random_uuid(),
    owner_user_id uuid        NOT NULL,
    region        text        NOT NULL DEFAULT 'Bac',
    created_at    timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT pk_trees PRIMARY KEY (id),
    -- Exactly one tree per user.
    CONSTRAINT uq_trees_owner UNIQUE (owner_user_id),
    CONSTRAINT fk_trees_owner FOREIGN KEY (owner_user_id) REFERENCES users (id),
    CONSTRAINT chk_trees_region CHECK (region IN ('Bac', 'Trung', 'Nam'))
);

-- ============================================================================
-- persons  (Requirements 3.1, 3.2, 3.5, 14.1)
-- ============================================================================
CREATE TABLE persons (
    id              uuid        NOT NULL DEFAULT gen_random_uuid(),
    tree_id         uuid        NOT NULL,
    display_name    text        NOT NULL,
    gender          text        NOT NULL,
    birth_order     integer,
    birth_year      integer,
    death_status    boolean     NOT NULL DEFAULT false,
    adoption_status boolean,
    vis_marital     text        NOT NULL DEFAULT 'private',
    vis_adoption    text        NOT NULL DEFAULT 'private',
    vis_death       text        NOT NULL DEFAULT 'private',
    created_at      timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT pk_persons PRIMARY KEY (id),
    CONSTRAINT fk_persons_tree FOREIGN KEY (tree_id) REFERENCES trees (id),
    CONSTRAINT chk_persons_display_name CHECK (char_length(display_name) BETWEEN 1 AND 100),
    CONSTRAINT chk_persons_gender CHECK (gender IN ('male', 'female')),
    CONSTRAINT chk_persons_birth_order CHECK (birth_order IS NULL OR birth_order BETWEEN 1 AND 99),
    -- Lower bound only; the current-year upper bound is enforced by the application.
    CONSTRAINT chk_persons_birth_year CHECK (birth_year IS NULL OR birth_year >= 1000),
    CONSTRAINT chk_persons_vis_marital CHECK (vis_marital IN ('private', 'public')),
    CONSTRAINT chk_persons_vis_adoption CHECK (vis_adoption IN ('private', 'public')),
    CONSTRAINT chk_persons_vis_death CHECK (vis_death IN ('private', 'public'))
);

CREATE INDEX ix_persons_tree_id ON persons (tree_id);

-- ============================================================================
-- relationships  (typed-edge table)  (Requirements 4.x, 5.x, 6.x, 12.x)
-- ============================================================================
CREATE TABLE relationships (
    id               uuid        NOT NULL DEFAULT gen_random_uuid(),
    tree_id          uuid        NOT NULL,
    type             text        NOT NULL,
    source_id        uuid        NOT NULL,
    target_id        uuid        NOT NULL,
    marital_status   text,
    social_type      text,
    asserted_label   text,
    derivation_state text        NOT NULL DEFAULT 'derived',
    created_at       timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT pk_relationships PRIMARY KEY (id),
    CONSTRAINT fk_relationships_tree FOREIGN KEY (tree_id) REFERENCES trees (id),
    CONSTRAINT fk_relationships_source FOREIGN KEY (source_id) REFERENCES persons (id),
    CONSTRAINT fk_relationships_target FOREIGN KEY (target_id) REFERENCES persons (id),
    -- No self-referencing edge. (4.2)
    CONSTRAINT chk_relationships_self_reference CHECK (source_id <> target_id),
    -- Edge-type discriminator domain.
    CONSTRAINT chk_relationships_type CHECK (
        type IN ('bloodline_father', 'bloodline_mother', 'marriage', 'non_bloodline', 'asserted')
    ),
    -- derivation_state domain. (7.x)
    CONSTRAINT chk_relationships_derivation_state CHECK (
        derivation_state IN ('derived', 'asserted', 'verified', 'conflict')
    ),
    -- marital_status is non-null with a valid value iff type = 'marriage'. (4.5)
    CONSTRAINT chk_relationships_marital_status CHECK (
        (type = 'marriage' AND marital_status IN ('married', 'divorced', 'deceased'))
        OR (type <> 'marriage' AND marital_status IS NULL)
    ),
    -- social_type is non-null with a valid value iff type = 'non_bloodline'. (4.6, 12.1)
    CONSTRAINT chk_relationships_social_type CHECK (
        (type = 'non_bloodline' AND social_type IN ('friend', 'teacher', 'colleague'))
        OR (type <> 'non_bloodline' AND social_type IS NULL)
    ),
    -- asserted_label is non-null with length 1-50 iff type = 'asserted'. (4.7, 6.1, 6.2)
    CONSTRAINT chk_relationships_asserted_label CHECK (
        (type = 'asserted' AND asserted_label IS NOT NULL
            AND char_length(asserted_label) BETWEEN 1 AND 50)
        OR (type <> 'asserted' AND asserted_label IS NULL)
    )
);

-- At most one father-child edge and one mother-child edge per child. (4.4)
CREATE UNIQUE INDEX ux_relationships_one_father
    ON relationships (target_id) WHERE type = 'bloodline_father';
CREATE UNIQUE INDEX ux_relationships_one_mother
    ON relationships (target_id) WHERE type = 'bloodline_mother';

-- Traversal / search indexes.
CREATE INDEX ix_relationships_tree_type ON relationships (tree_id, type);
CREATE INDEX ix_relationships_source ON relationships (source_id);
CREATE INDEX ix_relationships_target ON relationships (target_id);

-- ============================================================================
-- claims  (Requirements 11.2, 11.6)
-- ============================================================================
CREATE TABLE claims (
    id         uuid        NOT NULL DEFAULT gen_random_uuid(),
    person_id  uuid        NOT NULL,
    user_id    uuid        NOT NULL,
    claimed_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT pk_claims PRIMARY KEY (id),
    -- A node is claimed by at most one user.
    CONSTRAINT uq_claims_person UNIQUE (person_id),
    CONSTRAINT fk_claims_person FOREIGN KEY (person_id) REFERENCES persons (id),
    CONSTRAINT fk_claims_user FOREIGN KEY (user_id) REFERENCES users (id)
);

CREATE INDEX ix_claims_user_id ON claims (user_id);

-- ============================================================================
-- verification_codes  (Requirements 1.4, 1.8, 2.2, 2.7, 11.4, 11.5)
-- ============================================================================
CREATE TABLE verification_codes (
    id          uuid        NOT NULL DEFAULT gen_random_uuid(),
    purpose     text        NOT NULL,
    user_id     uuid,
    person_id   uuid,
    destination text        NOT NULL,
    code_hash   text        NOT NULL,
    issued_at   timestamptz NOT NULL,
    expires_at  timestamptz NOT NULL,
    attempts    integer     NOT NULL DEFAULT 0,
    consumed    boolean     NOT NULL DEFAULT false,
    CONSTRAINT pk_verification_codes PRIMARY KEY (id),
    CONSTRAINT chk_verification_codes_purpose CHECK (purpose IN ('signup', 'signin', 'claim')),
    CONSTRAINT fk_verification_codes_user FOREIGN KEY (user_id) REFERENCES users (id),
    CONSTRAINT fk_verification_codes_person FOREIGN KEY (person_id) REFERENCES persons (id)
);

CREATE INDEX ix_verification_codes_user_id ON verification_codes (user_id);
CREATE INDEX ix_verification_codes_person_id ON verification_codes (person_id);

-- ============================================================================
-- region_kinship_terms  (configuration data layer)  (Requirement 9)
-- ============================================================================
CREATE TABLE region_kinship_terms (
    region             text NOT NULL,
    canonical_relation text NOT NULL,
    term               text NOT NULL,
    CONSTRAINT pk_region_kinship_terms PRIMARY KEY (region, canonical_relation),
    CONSTRAINT chk_region_kinship_terms_region CHECK (region IN ('Bac', 'Trung', 'Nam'))
);
