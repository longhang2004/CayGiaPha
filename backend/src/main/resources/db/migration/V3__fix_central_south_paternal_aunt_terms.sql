-- V3__fix_central_south_paternal_aunt_terms.sql
-- Corrects two Central (Trung) and Southern (Nam) paternal kinship terms that V2 seeded
-- with the Northern (Bac) value. (Requirement 9: 9.1, 9.3, 9.7)
--
-- In Northern usage the father's ELDER sister (and her husband) are addressed with the same
-- "elder" honorific as the father's elder brother (bác). In Central and Southern usage, a
-- father's sister is "cô" regardless of her age, and her husband is "dượng". V2 incorrectly
-- applied the Northern "bác" to all three regions for these two relations; this migration fixes
-- Trung and Nam while leaving Bac (correctly "bác") and every other row untouched.
--
-- Only term VALUES change here — no canonical_relation keys are added or removed — so the
-- regional-coverage invariant (9.7: identical key set across Bac/Trung/Nam) is preserved.

-- Father's elder sister (blood): bác (Bac) -> cô (Trung/Nam).
UPDATE region_kinship_terms
   SET term = 'cô'
 WHERE region IN ('Trung', 'Nam')
   AND canonical_relation = 'u2:d1:PATERNAL:FEMALE:ELDER:s0';

-- Husband of father's elder sister (in-law / spouseHop): bác (Bac) -> dượng (Trung/Nam).
UPDATE region_kinship_terms
   SET term = 'dượng'
 WHERE region IN ('Trung', 'Nam')
   AND canonical_relation = 'u2:d1:PATERNAL:MALE:ELDER:s1';
