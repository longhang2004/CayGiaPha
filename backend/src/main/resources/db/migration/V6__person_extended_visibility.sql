-- V6__person_extended_visibility.sql
-- Extended per-field visibility for a person's identifying fields (Requirement 21): display name,
-- birth year, and primary photo. Each holds exactly 'private' or 'public' (21.1).
--
-- Defaults: display name and birth year default to 'public' so a shared genealogy is useful out of
-- the box (living individuals are still protected by Living_Person redaction, Requirement 20, which
-- is enabled by default); the more sensitive primary photo defaults to 'private'. An owner/linked
-- user can tighten or relax any of these per person (21.5).

ALTER TABLE persons
    ADD COLUMN vis_name       text NOT NULL DEFAULT 'public',
    ADD COLUMN vis_birth_year text NOT NULL DEFAULT 'public',
    ADD COLUMN vis_photo      text NOT NULL DEFAULT 'private';

ALTER TABLE persons
    ADD CONSTRAINT chk_persons_vis_name       CHECK (vis_name IN ('private', 'public')),
    ADD CONSTRAINT chk_persons_vis_birth_year CHECK (vis_birth_year IN ('private', 'public')),
    ADD CONSTRAINT chk_persons_vis_photo      CHECK (vis_photo IN ('private', 'public'));
