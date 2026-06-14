-- V9__person_photos.sql
-- Photos attached to a person (Requirement 24). Binary content is stored in object storage; only a
-- reference (object_key) and metadata live here (24.7). A person may have many photos; at most one
-- is the primary photo (24.2), enforced by a partial unique index.

CREATE TABLE person_photos (
    id           uuid        NOT NULL DEFAULT gen_random_uuid(),
    person_id    uuid        NOT NULL,
    object_key   text        NOT NULL,
    content_type text        NOT NULL,
    byte_size    bigint      NOT NULL,
    width        integer,
    height       integer,
    is_primary   boolean     NOT NULL DEFAULT false,
    created_at   timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT pk_person_photos PRIMARY KEY (id),
    CONSTRAINT fk_person_photos_person FOREIGN KEY (person_id)
        REFERENCES persons (id) ON DELETE CASCADE,
    CONSTRAINT uq_person_photos_object_key UNIQUE (object_key),
    CONSTRAINT chk_person_photos_content_type
        CHECK (content_type IN ('image/jpeg', 'image/png'))
);

CREATE INDEX ix_person_photos_person ON person_photos (person_id);

-- At most one primary photo per person (24.2).
CREATE UNIQUE INDEX ux_person_photos_one_primary
    ON person_photos (person_id) WHERE is_primary;
