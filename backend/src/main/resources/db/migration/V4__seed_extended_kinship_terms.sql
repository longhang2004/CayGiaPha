-- V4__seed_extended_kinship_terms.sql
-- Extends region_kinship_terms with three relation families that V2 did not cover, closing the
-- coverage gaps identified in the kinship assessment. (Requirement 9: 9.1, 9.3, 9.7)
--
--   1. Cousins (children of a parent's sibling):           u2:d2  -> anh/chị/em họ
--   2. Great-grandparents:                                 u3:d0  -> cụ ông/bà (Bắc), ông/bà cố (Trung/Nam)
--   3. Great-grandchildren:                                u0:d3  -> chắt
--
-- Key encoding is exactly CanonicalRelation#canonicalKey(): u<up>:d<down>:SIDE:GENDER:BRANCHORDER:s<0|1>.
-- Every new key is seeded for ALL THREE regions, so the regional-coverage invariant (9.7) — identical
-- key set across Bắc/Trung/Nam, enforced at startup by RegionCoverageValidator — is preserved.

INSERT INTO region_kinship_terms (region, canonical_relation, term) VALUES
    -- ===================================================================================
    -- Cousins (u2:d2, blood): child of a parent's sibling. The resolver's BRANCHORDER for a
    -- u2:d2 path compares the two PARENTS' seniority (the relative's connecting ancestor — the
    -- parent's sibling — versus ego's own parent), which matches the traditional Vietnamese rule
    -- that a cousin's rank follows their parent's birth order rather than the cousin's own age:
    --   ELDER branch  + MALE   -> anh họ   (elder male cousin)
    --   ELDER branch  + FEMALE -> chị họ   (elder female cousin)
    --   YOUNGER branch (either) -> em họ   (younger cousin)
    -- The same terms apply on both the paternal and maternal sides and across all three regions.
    -- ===================================================================================
    ('Bac',   'u2:d2:PATERNAL:MALE:ELDER:s0',     'anh họ'),
    ('Trung', 'u2:d2:PATERNAL:MALE:ELDER:s0',     'anh họ'),
    ('Nam',   'u2:d2:PATERNAL:MALE:ELDER:s0',     'anh họ'),
    ('Bac',   'u2:d2:PATERNAL:MALE:YOUNGER:s0',   'em họ'),
    ('Trung', 'u2:d2:PATERNAL:MALE:YOUNGER:s0',   'em họ'),
    ('Nam',   'u2:d2:PATERNAL:MALE:YOUNGER:s0',   'em họ'),
    ('Bac',   'u2:d2:PATERNAL:FEMALE:ELDER:s0',   'chị họ'),
    ('Trung', 'u2:d2:PATERNAL:FEMALE:ELDER:s0',   'chị họ'),
    ('Nam',   'u2:d2:PATERNAL:FEMALE:ELDER:s0',   'chị họ'),
    ('Bac',   'u2:d2:PATERNAL:FEMALE:YOUNGER:s0', 'em họ'),
    ('Trung', 'u2:d2:PATERNAL:FEMALE:YOUNGER:s0', 'em họ'),
    ('Nam',   'u2:d2:PATERNAL:FEMALE:YOUNGER:s0', 'em họ'),
    ('Bac',   'u2:d2:MATERNAL:MALE:ELDER:s0',     'anh họ'),
    ('Trung', 'u2:d2:MATERNAL:MALE:ELDER:s0',     'anh họ'),
    ('Nam',   'u2:d2:MATERNAL:MALE:ELDER:s0',     'anh họ'),
    ('Bac',   'u2:d2:MATERNAL:MALE:YOUNGER:s0',   'em họ'),
    ('Trung', 'u2:d2:MATERNAL:MALE:YOUNGER:s0',   'em họ'),
    ('Nam',   'u2:d2:MATERNAL:MALE:YOUNGER:s0',   'em họ'),
    ('Bac',   'u2:d2:MATERNAL:FEMALE:ELDER:s0',   'chị họ'),
    ('Trung', 'u2:d2:MATERNAL:FEMALE:ELDER:s0',   'chị họ'),
    ('Nam',   'u2:d2:MATERNAL:FEMALE:ELDER:s0',   'chị họ'),
    ('Bac',   'u2:d2:MATERNAL:FEMALE:YOUNGER:s0', 'em họ'),
    ('Trung', 'u2:d2:MATERNAL:FEMALE:YOUNGER:s0', 'em họ'),
    ('Nam',   'u2:d2:MATERNAL:FEMALE:YOUNGER:s0', 'em họ'),

    -- ===================================================================================
    -- Great-grandparents (u3:d0): one generation above grandparents. Northern dialect uses
    -- "cụ" (cụ ông / cụ bà); Central and Southern use "cố" (ông cố / bà cố). Following the
    -- grandparent precedent (u2:d0), the term does not distinguish paternal/maternal side.
    -- ===================================================================================
    ('Bac',   'u3:d0:PATERNAL:MALE:SELF:s0',   'cụ ông'),
    ('Trung', 'u3:d0:PATERNAL:MALE:SELF:s0',   'ông cố'),
    ('Nam',   'u3:d0:PATERNAL:MALE:SELF:s0',   'ông cố'),
    ('Bac',   'u3:d0:PATERNAL:FEMALE:SELF:s0', 'cụ bà'),
    ('Trung', 'u3:d0:PATERNAL:FEMALE:SELF:s0', 'bà cố'),
    ('Nam',   'u3:d0:PATERNAL:FEMALE:SELF:s0', 'bà cố'),
    ('Bac',   'u3:d0:MATERNAL:MALE:SELF:s0',   'cụ ông'),
    ('Trung', 'u3:d0:MATERNAL:MALE:SELF:s0',   'ông cố'),
    ('Nam',   'u3:d0:MATERNAL:MALE:SELF:s0',   'ông cố'),
    ('Bac',   'u3:d0:MATERNAL:FEMALE:SELF:s0', 'cụ bà'),
    ('Trung', 'u3:d0:MATERNAL:FEMALE:SELF:s0', 'bà cố'),
    ('Nam',   'u3:d0:MATERNAL:FEMALE:SELF:s0', 'bà cố'),

    -- ===================================================================================
    -- Great-grandchildren (u0:d3): one generation below grandchildren (cháu). The term "chắt"
    -- is pan-regional and gender-neutral.
    -- ===================================================================================
    ('Bac',   'u0:d3:SELF:MALE:SELF:s0',   'chắt'),
    ('Trung', 'u0:d3:SELF:MALE:SELF:s0',   'chắt'),
    ('Nam',   'u0:d3:SELF:MALE:SELF:s0',   'chắt'),
    ('Bac',   'u0:d3:SELF:FEMALE:SELF:s0', 'chắt'),
    ('Trung', 'u0:d3:SELF:FEMALE:SELF:s0', 'chắt'),
    ('Nam',   'u0:d3:SELF:FEMALE:SELF:s0', 'chắt');
