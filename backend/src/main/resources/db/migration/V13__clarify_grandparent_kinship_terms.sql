-- V13 — Clarify paternal vs maternal grandparent kinship terms
--
-- Previously both paternal and maternal grandparents were labelled just
-- "ông" / "bà". This migration updates them to use the more specific
-- Vietnamese terms that distinguish nội (paternal) and ngoại (maternal):
--
--   Paternal grandfather → ông nội
--   Paternal grandmother → bà nội
--   Maternal grandfather → ông ngoại
--   Maternal grandmother → bà ngoại
--
-- Great-grandparents (u3:d0) are also updated with a nội/ngoại distinction
-- for the Bắc dialect (cụ nội / cụ ngoại prefix) while Trung/Nam keep the
-- existing cố suffix with a nội/ngoại qualifier.

UPDATE region_kinship_terms SET term = 'ông nội'
WHERE canonical_key = 'u2:d0:PATERNAL:MALE:SELF:s0';

UPDATE region_kinship_terms SET term = 'bà nội'
WHERE canonical_key = 'u2:d0:PATERNAL:FEMALE:SELF:s0';

UPDATE region_kinship_terms SET term = 'ông ngoại'
WHERE canonical_key = 'u2:d0:MATERNAL:MALE:SELF:s0';

UPDATE region_kinship_terms SET term = 'bà ngoại'
WHERE canonical_key = 'u2:d0:MATERNAL:FEMALE:SELF:s0';
