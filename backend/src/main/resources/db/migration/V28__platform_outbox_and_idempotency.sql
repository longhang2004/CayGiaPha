-- Portfolio platform tables for the hexagonal Java API.
-- These do not change the product graph contract (persons / primitive edges).

CREATE TABLE domain_outbox (
    id             uuid        NOT NULL DEFAULT gen_random_uuid(),
    aggregate_type text        NOT NULL,
    aggregate_id   uuid        NOT NULL,
    event_type     text        NOT NULL,
    payload        text        NOT NULL,
    created_at     timestamptz NOT NULL DEFAULT now(),
    published_at   timestamptz,
    CONSTRAINT pk_domain_outbox PRIMARY KEY (id),
    CONSTRAINT chk_domain_outbox_aggregate_type CHECK (char_length(aggregate_type) BETWEEN 1 AND 80),
    CONSTRAINT chk_domain_outbox_event_type CHECK (char_length(event_type) BETWEEN 1 AND 80)
);

CREATE INDEX ix_domain_outbox_unpublished
    ON domain_outbox (created_at)
    WHERE published_at IS NULL;

CREATE INDEX ix_domain_outbox_aggregate
    ON domain_outbox (aggregate_type, aggregate_id);

CREATE TABLE idempotency_keys (
    idempotency_key text        NOT NULL,
    user_id         uuid,
    request_hash    text        NOT NULL,
    response_status integer     NOT NULL,
    response_body   text,
    created_at      timestamptz NOT NULL DEFAULT now(),
    expires_at      timestamptz NOT NULL,
    CONSTRAINT pk_idempotency_keys PRIMARY KEY (idempotency_key),
    CONSTRAINT chk_idempotency_keys_status CHECK (response_status BETWEEN 100 AND 599)
);

CREATE INDEX ix_idempotency_keys_expires_at ON idempotency_keys (expires_at);
