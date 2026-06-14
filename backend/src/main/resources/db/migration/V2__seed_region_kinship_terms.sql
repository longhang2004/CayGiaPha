-- V2__seed_region_kinship_terms.sql
-- Seeds the region_kinship_terms configuration data layer for all three regions
-- (Bac/Trung/Nam) with the common Vietnamese kinship relations. (Requirement 9: 9.1, 9.7)
--
-- Keys use the exact CanonicalRelation#canonicalKey() encoding produced by the Kinship_Resolver:
--     u<upCount>:d<downCount>:SIDE:GENDER:BRANCHORDER:s<0|1>
--   SIDE        in {PATERNAL, MATERNAL, SELF}
--   GENDER      in {MALE, FEMALE}        (gender of the target person)
--   BRANCHORDER in {ELDER, YOUNGER, SELF} (UNKNOWN never resolves, so is never seeded)
--   s0 = blood relation, s1 = target reached via a trailing marriage edge (an in-law)
--
-- REGIONAL COVERAGE INVARIANT (9.7): every canonical_relation present for ANY region is present
-- for ALL three regions. The term may legitimately differ by dialect (e.g. parents below), but the
-- KEY SET is identical across Bac/Trung/Nam. Rows are grouped by key with the three region rows
-- adjacent so the invariant is verifiable by inspection and enforced by the startup coverage check.

INSERT INTO region_kinship_terms (region, canonical_relation, term) VALUES
    -- ===================================================================================
    -- Spouse (direct marriage edge): vợ / chồng. (u0:d0, spouseHop)
    -- ===================================================================================
    ('Bac',   'u0:d0:SELF:MALE:SELF:s1',   'chồng'),
    ('Trung', 'u0:d0:SELF:MALE:SELF:s1',   'chồng'),
    ('Nam',   'u0:d0:SELF:MALE:SELF:s1',   'chồng'),
    ('Bac',   'u0:d0:SELF:FEMALE:SELF:s1', 'vợ'),
    ('Trung', 'u0:d0:SELF:FEMALE:SELF:s1', 'vợ'),
    ('Nam',   'u0:d0:SELF:FEMALE:SELF:s1', 'vợ'),

    -- ===================================================================================
    -- Parents (u1:d0). Dialect differs: Bắc bố/mẹ, Trung cha/mạ, Nam ba/má.
    -- Only paternal-male (father) and maternal-female (mother) are physically reachable.
    -- ===================================================================================
    ('Bac',   'u1:d0:PATERNAL:MALE:SELF:s0',   'bố'),
    ('Trung', 'u1:d0:PATERNAL:MALE:SELF:s0',   'cha'),
    ('Nam',   'u1:d0:PATERNAL:MALE:SELF:s0',   'ba'),
    ('Bac',   'u1:d0:MATERNAL:FEMALE:SELF:s0', 'mẹ'),
    ('Trung', 'u1:d0:MATERNAL:FEMALE:SELF:s0', 'mạ'),
    ('Nam',   'u1:d0:MATERNAL:FEMALE:SELF:s0', 'má'),

    -- ===================================================================================
    -- Grandparents (u2:d0): ông / bà, paternal (nội) and maternal (ngoại) sides.
    -- ===================================================================================
    ('Bac',   'u2:d0:PATERNAL:MALE:SELF:s0',   'ông'),
    ('Trung', 'u2:d0:PATERNAL:MALE:SELF:s0',   'ông'),
    ('Nam',   'u2:d0:PATERNAL:MALE:SELF:s0',   'ông'),
    ('Bac',   'u2:d0:PATERNAL:FEMALE:SELF:s0', 'bà'),
    ('Trung', 'u2:d0:PATERNAL:FEMALE:SELF:s0', 'bà'),
    ('Nam',   'u2:d0:PATERNAL:FEMALE:SELF:s0', 'bà'),
    ('Bac',   'u2:d0:MATERNAL:MALE:SELF:s0',   'ông'),
    ('Trung', 'u2:d0:MATERNAL:MALE:SELF:s0',   'ông'),
    ('Nam',   'u2:d0:MATERNAL:MALE:SELF:s0',   'ông'),
    ('Bac',   'u2:d0:MATERNAL:FEMALE:SELF:s0', 'bà'),
    ('Trung', 'u2:d0:MATERNAL:FEMALE:SELF:s0', 'bà'),
    ('Nam',   'u2:d0:MATERNAL:FEMALE:SELF:s0', 'bà'),

    -- ===================================================================================
    -- Parent's-generation siblings (u2:d1, blood). Paternal: bác/chú (male), bác/cô (female);
    -- maternal: cậu (male), dì (female). Bắc convention uses bác for the mother's ELDER sibling.
    -- ===================================================================================
    ('Bac',   'u2:d1:PATERNAL:MALE:ELDER:s0',     'bác'),
    ('Trung', 'u2:d1:PATERNAL:MALE:ELDER:s0',     'bác'),
    ('Nam',   'u2:d1:PATERNAL:MALE:ELDER:s0',     'bác'),
    ('Bac',   'u2:d1:PATERNAL:MALE:YOUNGER:s0',   'chú'),
    ('Trung', 'u2:d1:PATERNAL:MALE:YOUNGER:s0',   'chú'),
    ('Nam',   'u2:d1:PATERNAL:MALE:YOUNGER:s0',   'chú'),
    ('Bac',   'u2:d1:PATERNAL:FEMALE:ELDER:s0',   'bác'),
    ('Trung', 'u2:d1:PATERNAL:FEMALE:ELDER:s0',   'bác'),
    ('Nam',   'u2:d1:PATERNAL:FEMALE:ELDER:s0',   'bác'),
    ('Bac',   'u2:d1:PATERNAL:FEMALE:YOUNGER:s0', 'cô'),
    ('Trung', 'u2:d1:PATERNAL:FEMALE:YOUNGER:s0', 'cô'),
    ('Nam',   'u2:d1:PATERNAL:FEMALE:YOUNGER:s0', 'cô'),
    ('Bac',   'u2:d1:MATERNAL:MALE:ELDER:s0',     'bác'),
    ('Trung', 'u2:d1:MATERNAL:MALE:ELDER:s0',     'cậu'),
    ('Nam',   'u2:d1:MATERNAL:MALE:ELDER:s0',     'cậu'),
    ('Bac',   'u2:d1:MATERNAL:MALE:YOUNGER:s0',   'cậu'),
    ('Trung', 'u2:d1:MATERNAL:MALE:YOUNGER:s0',   'cậu'),
    ('Nam',   'u2:d1:MATERNAL:MALE:YOUNGER:s0',   'cậu'),
    ('Bac',   'u2:d1:MATERNAL:FEMALE:ELDER:s0',   'bác'),
    ('Trung', 'u2:d1:MATERNAL:FEMALE:ELDER:s0',   'dì'),
    ('Nam',   'u2:d1:MATERNAL:FEMALE:ELDER:s0',   'dì'),
    ('Bac',   'u2:d1:MATERNAL:FEMALE:YOUNGER:s0', 'dì'),
    ('Trung', 'u2:d1:MATERNAL:FEMALE:YOUNGER:s0', 'dì'),
    ('Nam',   'u2:d1:MATERNAL:FEMALE:YOUNGER:s0', 'dì'),

    -- ===================================================================================
    -- Parent's-sibling spouses (u2:d1, in-law / spouseHop). target FEMALE+s1 => blood relative
    -- was male (his wife); target MALE+s1 => blood relative was female (her husband).
    -- ===================================================================================
    ('Bac',   'u2:d1:PATERNAL:FEMALE:ELDER:s1',   'bác'),   -- wife of father's elder brother
    ('Trung', 'u2:d1:PATERNAL:FEMALE:ELDER:s1',   'bác'),
    ('Nam',   'u2:d1:PATERNAL:FEMALE:ELDER:s1',   'bác'),
    ('Bac',   'u2:d1:PATERNAL:FEMALE:YOUNGER:s1', 'thím'),  -- wife of father's younger brother (chú)
    ('Trung', 'u2:d1:PATERNAL:FEMALE:YOUNGER:s1', 'thím'),
    ('Nam',   'u2:d1:PATERNAL:FEMALE:YOUNGER:s1', 'thím'),
    ('Bac',   'u2:d1:PATERNAL:MALE:ELDER:s1',     'bác'),   -- husband of father's elder sister
    ('Trung', 'u2:d1:PATERNAL:MALE:ELDER:s1',     'bác'),
    ('Nam',   'u2:d1:PATERNAL:MALE:ELDER:s1',     'bác'),
    ('Bac',   'u2:d1:PATERNAL:MALE:YOUNGER:s1',   'dượng'), -- husband of father's younger sister (cô)
    ('Trung', 'u2:d1:PATERNAL:MALE:YOUNGER:s1',   'dượng'),
    ('Nam',   'u2:d1:PATERNAL:MALE:YOUNGER:s1',   'dượng'),
    ('Bac',   'u2:d1:MATERNAL:FEMALE:ELDER:s1',   'mợ'),    -- wife of mother's elder brother (cậu)
    ('Trung', 'u2:d1:MATERNAL:FEMALE:ELDER:s1',   'mợ'),
    ('Nam',   'u2:d1:MATERNAL:FEMALE:ELDER:s1',   'mợ'),
    ('Bac',   'u2:d1:MATERNAL:FEMALE:YOUNGER:s1', 'mợ'),    -- wife of mother's younger brother (cậu)
    ('Trung', 'u2:d1:MATERNAL:FEMALE:YOUNGER:s1', 'mợ'),
    ('Nam',   'u2:d1:MATERNAL:FEMALE:YOUNGER:s1', 'mợ'),
    ('Bac',   'u2:d1:MATERNAL:MALE:ELDER:s1',     'dượng'), -- husband of mother's elder sister (dì)
    ('Trung', 'u2:d1:MATERNAL:MALE:ELDER:s1',     'dượng'),
    ('Nam',   'u2:d1:MATERNAL:MALE:ELDER:s1',     'dượng'),
    ('Bac',   'u2:d1:MATERNAL:MALE:YOUNGER:s1',   'dượng'), -- husband of mother's younger sister (dì)
    ('Trung', 'u2:d1:MATERNAL:MALE:YOUNGER:s1',   'dượng'),
    ('Nam',   'u2:d1:MATERNAL:MALE:YOUNGER:s1',   'dượng'),

    -- ===================================================================================
    -- Same-generation siblings (u1:d1, blood): anh (elder brother), chị (elder sister),
    -- em (younger sibling, either gender). Seeded for both sides (BFS may meet via either parent).
    -- ===================================================================================
    ('Bac',   'u1:d1:PATERNAL:MALE:ELDER:s0',     'anh'),
    ('Trung', 'u1:d1:PATERNAL:MALE:ELDER:s0',     'anh'),
    ('Nam',   'u1:d1:PATERNAL:MALE:ELDER:s0',     'anh'),
    ('Bac',   'u1:d1:PATERNAL:MALE:YOUNGER:s0',   'em'),
    ('Trung', 'u1:d1:PATERNAL:MALE:YOUNGER:s0',   'em'),
    ('Nam',   'u1:d1:PATERNAL:MALE:YOUNGER:s0',   'em'),
    ('Bac',   'u1:d1:PATERNAL:FEMALE:ELDER:s0',   'chị'),
    ('Trung', 'u1:d1:PATERNAL:FEMALE:ELDER:s0',   'chị'),
    ('Nam',   'u1:d1:PATERNAL:FEMALE:ELDER:s0',   'chị'),
    ('Bac',   'u1:d1:PATERNAL:FEMALE:YOUNGER:s0', 'em'),
    ('Trung', 'u1:d1:PATERNAL:FEMALE:YOUNGER:s0', 'em'),
    ('Nam',   'u1:d1:PATERNAL:FEMALE:YOUNGER:s0', 'em'),
    ('Bac',   'u1:d1:MATERNAL:MALE:ELDER:s0',     'anh'),
    ('Trung', 'u1:d1:MATERNAL:MALE:ELDER:s0',     'anh'),
    ('Nam',   'u1:d1:MATERNAL:MALE:ELDER:s0',     'anh'),
    ('Bac',   'u1:d1:MATERNAL:MALE:YOUNGER:s0',   'em'),
    ('Trung', 'u1:d1:MATERNAL:MALE:YOUNGER:s0',   'em'),
    ('Nam',   'u1:d1:MATERNAL:MALE:YOUNGER:s0',   'em'),
    ('Bac',   'u1:d1:MATERNAL:FEMALE:ELDER:s0',   'chị'),
    ('Trung', 'u1:d1:MATERNAL:FEMALE:ELDER:s0',   'chị'),
    ('Nam',   'u1:d1:MATERNAL:FEMALE:ELDER:s0',   'chị'),
    ('Bac',   'u1:d1:MATERNAL:FEMALE:YOUNGER:s0', 'em'),
    ('Trung', 'u1:d1:MATERNAL:FEMALE:YOUNGER:s0', 'em'),
    ('Nam',   'u1:d1:MATERNAL:FEMALE:YOUNGER:s0', 'em'),

    -- ===================================================================================
    -- Sibling spouses (u1:d1, in-law / spouseHop): addressed by sibling generation term.
    -- ===================================================================================
    ('Bac',   'u1:d1:PATERNAL:FEMALE:ELDER:s1',   'chị'),   -- elder brother's wife (chị dâu)
    ('Trung', 'u1:d1:PATERNAL:FEMALE:ELDER:s1',   'chị'),
    ('Nam',   'u1:d1:PATERNAL:FEMALE:ELDER:s1',   'chị'),
    ('Bac',   'u1:d1:PATERNAL:FEMALE:YOUNGER:s1', 'em'),    -- younger brother's wife (em dâu)
    ('Trung', 'u1:d1:PATERNAL:FEMALE:YOUNGER:s1', 'em'),
    ('Nam',   'u1:d1:PATERNAL:FEMALE:YOUNGER:s1', 'em'),
    ('Bac',   'u1:d1:PATERNAL:MALE:ELDER:s1',     'anh'),   -- elder sister's husband (anh rể)
    ('Trung', 'u1:d1:PATERNAL:MALE:ELDER:s1',     'anh'),
    ('Nam',   'u1:d1:PATERNAL:MALE:ELDER:s1',     'anh'),
    ('Bac',   'u1:d1:PATERNAL:MALE:YOUNGER:s1',   'em'),    -- younger sister's husband (em rể)
    ('Trung', 'u1:d1:PATERNAL:MALE:YOUNGER:s1',   'em'),
    ('Nam',   'u1:d1:PATERNAL:MALE:YOUNGER:s1',   'em'),
    ('Bac',   'u1:d1:MATERNAL:FEMALE:ELDER:s1',   'chị'),
    ('Trung', 'u1:d1:MATERNAL:FEMALE:ELDER:s1',   'chị'),
    ('Nam',   'u1:d1:MATERNAL:FEMALE:ELDER:s1',   'chị'),
    ('Bac',   'u1:d1:MATERNAL:FEMALE:YOUNGER:s1', 'em'),
    ('Trung', 'u1:d1:MATERNAL:FEMALE:YOUNGER:s1', 'em'),
    ('Nam',   'u1:d1:MATERNAL:FEMALE:YOUNGER:s1', 'em'),
    ('Bac',   'u1:d1:MATERNAL:MALE:ELDER:s1',     'anh'),
    ('Trung', 'u1:d1:MATERNAL:MALE:ELDER:s1',     'anh'),
    ('Nam',   'u1:d1:MATERNAL:MALE:ELDER:s1',     'anh'),
    ('Bac',   'u1:d1:MATERNAL:MALE:YOUNGER:s1',   'em'),
    ('Trung', 'u1:d1:MATERNAL:MALE:YOUNGER:s1',   'em'),
    ('Nam',   'u1:d1:MATERNAL:MALE:YOUNGER:s1',   'em'),

    -- ===================================================================================
    -- Direct descendants: con (child, u0:d1) and cháu (grandchild, u0:d2).
    -- ===================================================================================
    ('Bac',   'u0:d1:SELF:MALE:SELF:s0',   'con'),
    ('Trung', 'u0:d1:SELF:MALE:SELF:s0',   'con'),
    ('Nam',   'u0:d1:SELF:MALE:SELF:s0',   'con'),
    ('Bac',   'u0:d1:SELF:FEMALE:SELF:s0', 'con'),
    ('Trung', 'u0:d1:SELF:FEMALE:SELF:s0', 'con'),
    ('Nam',   'u0:d1:SELF:FEMALE:SELF:s0', 'con'),
    ('Bac',   'u0:d2:SELF:MALE:SELF:s0',   'cháu'),
    ('Trung', 'u0:d2:SELF:MALE:SELF:s0',   'cháu'),
    ('Nam',   'u0:d2:SELF:MALE:SELF:s0',   'cháu'),
    ('Bac',   'u0:d2:SELF:FEMALE:SELF:s0', 'cháu'),
    ('Trung', 'u0:d2:SELF:FEMALE:SELF:s0', 'cháu'),
    ('Nam',   'u0:d2:SELF:FEMALE:SELF:s0', 'cháu'),

    -- ===================================================================================
    -- Nephews / nieces (u1:d2, blood): sibling's children, addressed as cháu. The branch order
    -- (sibling elder/younger than ego) is part of the key, so both variants are seeded.
    -- ===================================================================================
    ('Bac',   'u1:d2:PATERNAL:MALE:ELDER:s0',     'cháu'),
    ('Trung', 'u1:d2:PATERNAL:MALE:ELDER:s0',     'cháu'),
    ('Nam',   'u1:d2:PATERNAL:MALE:ELDER:s0',     'cháu'),
    ('Bac',   'u1:d2:PATERNAL:MALE:YOUNGER:s0',   'cháu'),
    ('Trung', 'u1:d2:PATERNAL:MALE:YOUNGER:s0',   'cháu'),
    ('Nam',   'u1:d2:PATERNAL:MALE:YOUNGER:s0',   'cháu'),
    ('Bac',   'u1:d2:PATERNAL:FEMALE:ELDER:s0',   'cháu'),
    ('Trung', 'u1:d2:PATERNAL:FEMALE:ELDER:s0',   'cháu'),
    ('Nam',   'u1:d2:PATERNAL:FEMALE:ELDER:s0',   'cháu'),
    ('Bac',   'u1:d2:PATERNAL:FEMALE:YOUNGER:s0', 'cháu'),
    ('Trung', 'u1:d2:PATERNAL:FEMALE:YOUNGER:s0', 'cháu'),
    ('Nam',   'u1:d2:PATERNAL:FEMALE:YOUNGER:s0', 'cháu'),
    ('Bac',   'u1:d2:MATERNAL:MALE:ELDER:s0',     'cháu'),
    ('Trung', 'u1:d2:MATERNAL:MALE:ELDER:s0',     'cháu'),
    ('Nam',   'u1:d2:MATERNAL:MALE:ELDER:s0',     'cháu'),
    ('Bac',   'u1:d2:MATERNAL:MALE:YOUNGER:s0',   'cháu'),
    ('Trung', 'u1:d2:MATERNAL:MALE:YOUNGER:s0',   'cháu'),
    ('Nam',   'u1:d2:MATERNAL:MALE:YOUNGER:s0',   'cháu'),
    ('Bac',   'u1:d2:MATERNAL:FEMALE:ELDER:s0',   'cháu'),
    ('Trung', 'u1:d2:MATERNAL:FEMALE:ELDER:s0',   'cháu'),
    ('Nam',   'u1:d2:MATERNAL:FEMALE:ELDER:s0',   'cháu'),
    ('Bac',   'u1:d2:MATERNAL:FEMALE:YOUNGER:s0', 'cháu'),
    ('Trung', 'u1:d2:MATERNAL:FEMALE:YOUNGER:s0', 'cháu'),
    ('Nam',   'u1:d2:MATERNAL:FEMALE:YOUNGER:s0', 'cháu');
