-- V7__legal_documents_and_consent.sql
-- Terms of Service / Privacy Policy documents and recorded user consent (Requirement 23).
--
--   * legal_documents — versioned ToS and Privacy Policy bodies; the current document of a type is
--     the row with the highest version. (23.1)
--   * user_consents   — a user's acceptance of a specific document version, with a timestamp. (23.2)

CREATE TABLE legal_documents (
    id           uuid        NOT NULL DEFAULT gen_random_uuid(),
    doc_type     text        NOT NULL,
    version      integer     NOT NULL,
    body         text        NOT NULL,
    published_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT pk_legal_documents PRIMARY KEY (id),
    CONSTRAINT chk_legal_documents_type CHECK (doc_type IN ('tos', 'privacy')),
    CONSTRAINT uq_legal_documents_type_version UNIQUE (doc_type, version)
);

CREATE TABLE user_consents (
    id          uuid        NOT NULL DEFAULT gen_random_uuid(),
    user_id     uuid        NOT NULL,
    doc_type    text        NOT NULL,
    version     integer     NOT NULL,
    accepted_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT pk_user_consents PRIMARY KEY (id),
    CONSTRAINT fk_user_consents_user FOREIGN KEY (user_id) REFERENCES users (id),
    CONSTRAINT chk_user_consents_type CHECK (doc_type IN ('tos', 'privacy'))
);

CREATE INDEX ix_user_consents_user ON user_consents (user_id);

-- Seed version 1 of each document. The bodies are placeholders pending legal review (the system
-- behavior — versioned consent capture — is what these requirements specify; the legal wording is a
-- separate, counsel-reviewed concern).
INSERT INTO legal_documents (doc_type, version, body) VALUES
    ('tos', 1, 'Điều khoản dịch vụ (bản nháp — cần luật sư rà soát). Terms of Service (placeholder, pending legal review).'),
    ('privacy', 1, 'Chính sách bảo mật (bản nháp — cần luật sư rà soát). Privacy Policy (placeholder, pending legal review). Categories of personal data stored, purposes of processing, data-subject rights (export/correction/erasure), and a data-protection contact point are described here.');
