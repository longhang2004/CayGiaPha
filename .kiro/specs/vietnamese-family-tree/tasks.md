# Implementation Plan: Vietnamese Family Tree (Cây Gia Phả)

## Overview

This plan records implementation of the Vietnamese Family Tree across the active **Next.js
full-stack application**, the inactive/reference **Spring Boot / Java** module, and
**PostgreSQL**. As of 2026-07-10, `frontend/` is the production-priority runtime: Next.js Route
Handlers and TypeScript services own active behavior and persistence through Drizzle ORM. Java
tasks below are retained as historical/reference implementation records and must not be used to
infer the active request path. Work was sequenced so foundations
come first: scaffolding, then the pure-domain core (Graph_Store structural invariants and the
Kinship_Resolver) which is fully property-testable in isolation, then asserted/derived handling and
deletion, then authentication/authorization/privacy, search, the frontend, the help system,
accessibility, and finally integration and performance verification.

Property-based tests (PBT) use **jqwik** for the Java domain layer and **fast-check** for shared
TypeScript logic. Each PBT is a separate, optional (`*`) sub-task placed next to the implementation
it validates, references its design **Property number**, and is tagged per the design convention:
`Feature: vietnamese-family-tree, Property {number}`. Each property runs ≥100 generated cases. The
external identity/delivery providers and persistence are mocked/in-memory for property tests.

All 26 requirements and all 31 correctness properties are referenced by at least one task. A checked
box records that an implementation task landed; it is not evidence that current runtime behavior,
documentation, prototypes, and verification remain synchronized. Current readiness must be checked
against the active Next.js code and current tests.

### Known active-runtime gaps — 2026-07-13

- The active authorization context still carries a first-owned-tree fallback and does not expose the
  finalized Owner/Contributor/Linked/Reader capability model.
- Password-recovery UI/helpers exist, but the active Next.js request/confirm handlers are missing.
- Claim verification is not yet mounted as a production recipient journey and is not yet bound to
  the authenticated account identity.
- Privacy projection, account deletion, relationship replacement, photo cleanup, search response,
  and prototype isolation require the remediation tasks below. Current evidence is maintained in
  `conformance.md`; checked historical tasks are not readiness evidence.

## Tasks

- [x] 1. Project scaffolding and shared foundations
  - [x] 1.1 Initialize the Spring Boot API module
    - Create a Spring Boot (Java 21) project with web, validation, Spring Data JPA, Flyway, and the
      PostgreSQL driver; configure local/test profiles (Testcontainers Postgres).
    - Add jqwik to the test scope and establish the controller/service/repository layering.
    - _Requirements: infrastructure for all backend requirements_

  - [x] 1.2 Create the PostgreSQL schema via Flyway migrations
    - Author migrations for `users`, `sessions`, `trees`, `persons`, `relationships`, `claims`,
      `verification_codes`, and `region_kinship_terms` exactly per the design Data Models, including
      partial unique indexes (one father / one mother per child), `CHECK (source_id <> target_id)`,
      type-conditional CHECK constraints on `marital_status`/`social_type`/`asserted_label`, and
      traversal indexes on `(tree_id, type)`, `(source_id)`, `(target_id)`.
    - _Requirements: 3.2, 4.2, 4.4, 4.5, 4.6, 4.7, 9.1, 13.1, 14.1_

  - [x] 1.3 Initialize the Next.js frontend app
    - Scaffold a Next.js (React, TypeScript) app with an API client layer, session-cookie handling,
      base layout/routing, and a component test runner; add fast-check to the test scope.
    - _Requirements: infrastructure for all frontend requirements_

  - [x] 1.4 Define the JSON error envelope and global exception handling
    - Implement the `{ "error": { code, field?, message } }` envelope and a Spring
      `@RestControllerAdvice` mapping each category to its HTTP status per the Error Handling table;
      make every mutation transactional so failures persist nothing.
    - _Requirements: 1.6, 1.7, 3.6, 4.2, 4.8, 4.9, 11.7, 13.5, 16.8_

- [x] 2. Core data model and Graph_Store structural invariants
  - [x] 2.1 Implement Person and Relationship JPA entities and repositories
    - Map the `persons` and `relationships` tables (with the `type` discriminator and nullable
      type-specific columns) and their Spring Data repositories.
    - _Requirements: 3.2, 4.1, 4.3, 4.5, 4.6, 4.7_

  - [x] 2.2 Implement Graph_Store person create/edit/read with field-bounds validation
    - Enforce display name 1–100 chars, gender ∈ {male, female}, optional birth order 1–99, optional
      birth year 1000–current year, and death-status boolean; partial edits update only specified
      fields; reject nonexistent targets; return the created node id.
    - _Requirements: 3.1, 3.2, 3.3, 3.5, 3.6, 3.7_

  - [x] 2.3 Write property test for person field-bounds validation
    - **Property 4: Person field-bounds validation** — accept iff all field bounds hold; rejected
      requests leave the node unchanged and name the invalid field.
    - Tag: `Feature: vietnamese-family-tree, Property 4`
    - _Validates: Requirements 3.2, 3.6_

  - [x] 2.4 Write property test for person create/edit round-trip and partial update
    - **Property 5: Person create/edit round-trip and partial update** — reading after create/edit
      returns exactly stored values; unspecified fields unchanged.
    - Tag: `Feature: vietnamese-family-tree, Property 5`
    - _Validates: Requirements 3.1, 3.3_

  - [x] 2.5 Implement typed-edge creation with structural constraints
    - Create bloodline (father/mother), marriage, non-bloodline, and asserted edges; reject
      self-referencing edges, require existing endpoints, enforce at-most-one father/mother, validate
      the marital-status enum, the social-type enum, and asserted-label length 1–50.
    - _Requirements: 4.1, 4.2, 4.4, 4.5, 4.6, 4.7, 4.8, 5.5, 6.1, 6.2, 12.1, 12.2_

  - [x] 2.6 Write property test for no self-referencing edge
    - **Property 6: No self-referencing edge** — any edge type with equal source/target is rejected.
    - Tag: `Feature: vietnamese-family-tree, Property 6`
    - _Validates: Requirements 4.1, 4.2_

  - [x] 2.7 Write property test for at-most-one father and one mother
    - **Property 7: At-most-one father and one mother** — every child ends with ≤1 father and ≤1
      mother edge; a second is rejected.
    - Tag: `Feature: vietnamese-family-tree, Property 7`
    - _Validates: Requirements 4.4_

  - [x] 2.8 Write property test for asserted-label validation
    - **Property 9: Asserted-label validation** — accept iff label length 1–50; accepted edges link
      exactly the two specified nodes; rejected requests create nothing.
    - Tag: `Feature: vietnamese-family-tree, Property 9`
    - _Validates: Requirements 4.7, 6.1, 6.2_

  - [x] 2.9 Implement bloodline cycle prevention
    - Before inserting a bloodline edge `(p, c)`, run a recursive reachability check and reject the
      edge if `c` is an ancestor of `p`.
    - _Requirements: 4.9_

  - [x] 2.10 Write property test for bloodline acyclicity
    - **Property 8: Bloodline acyclicity** — a candidate is rejected iff it would create a cycle; the
      stored bloodline set is always acyclic.
    - Tag: `Feature: vietnamese-family-tree, Property 8`
    - _Validates: Requirements 4.9_

- [x] 3. Kinship_Resolver
  - [x] 3.1 Build the in-memory kinship graph projection
    - Load only bloodline edges (tagged father/mother → side + up/down) and marriage edges (spouse);
      exclude non-bloodline and asserted edges from all path computation; support per-tree caching
      invalidated on edge mutation.
    - _Requirements: 6.4, 12.3_

  - [x] 3.2 Write property test for non-derived edges excluded from path computation
    - **Property 14: Non-derived edges excluded from path computation** — adding non-bloodline or
      asserted edges changes no computed address or derived connectivity; asserted pairs return the
      stored label and the asserted edge is never traversed.
    - Tag: `Feature: vietnamese-family-tree, Property 14`
    - _Validates: Requirements 6.4, 12.3_

  - [x] 3.3 Implement BFS path-finding and canonical-relation derivation
    - Compute the shortest kinship path ego→target; reduce it to the canonical descriptor
      (upCount, downCount, side, targetGender, branchOrder, spouseHop); select paternal vs maternal
      side and elder/younger via birth order then birth year; return the unresolved indicator when no
      path exists or when elder/younger cannot be distinguished.
    - _Requirements: 5.4, 8.1, 8.2, 8.3, 8.4, 8.5, 8.7_

  - [x] 3.4 Write property test for resolver totality
    - **Property 10: Resolver totality** — for any graph and ordered pair, the resolver returns a
      defined term or the explicit unresolved indicator, never an error/crash.
    - Tag: `Feature: vietnamese-family-tree, Property 10`
    - _Validates: Requirements 5.4, 8.7, 10.1, 10.3_

  - [x] 3.5 Write property test for side selection
    - **Property 11: Side selection** — paternal term (bác/chú) when the branch leaves via a father
      link, maternal term (cậu) when via a mother link.
    - Tag: `Feature: vietnamese-family-tree, Property 11`
    - _Validates: Requirements 8.2, 8.3_

  - [x] 3.6 Write property test for elder/younger selection
    - **Property 12: Elder/younger selection** — elder term when born before the connecting parent,
      younger when after (birth order, falling back to birth year); unresolved when both absent/equal.
    - Tag: `Feature: vietnamese-family-tree, Property 12`
    - _Validates: Requirements 8.4, 8.5_

  - [x] 3.7 Implement region term lookup and address symmetry
    - Encode the canonical key, query `region_kinship_terms` for the tree's region, and return the
      term or undefined-for-region; ensure reversed paths map to inverse terms (ascendant/descendant).
    - _Requirements: 8.6, 9.3, 9.4_

  - [x] 3.8 Write property test for address symmetry
    - **Property 13: Address symmetry** — if ego addresses target with a descendant term (cháu),
      target addresses ego with the corresponding ascendant term (bác/chú/cô/dì/cậu).
    - Tag: `Feature: vietnamese-family-tree, Property 13`
    - _Validates: Requirements 8.6_

  - [x] 3.9 Seed multi-region kinship terms and implement region change
    - Populate `region_kinship_terms` for Bắc/Trung/Nam; add a data-integrity check that every
      canonical relation defined for any region is defined for all three; implement the region-change
      endpoint with invalid-region rejection (retain previous region).
    - _Requirements: 9.1, 9.2, 9.5, 9.6, 9.7_

  - [x] 3.10 Write property test for region term selection
    - **Property 15: Region term selection** — the resolver returns the term for the tree's current
      region, and after a region change returns the new region's term.
    - Tag: `Feature: vietnamese-family-tree, Property 15`
    - _Validates: Requirements 9.3, 9.5_

  - [x] 3.11 Write property test for regional coverage
    - **Property 16: Regional coverage** — every canonical relation defined under any region resolves
      to a defined term under all three regions.
    - Tag: `Feature: vietnamese-family-tree, Property 16`
    - _Validates: Requirements 9.7_

  - [x] 3.12 Implement change-viewpoint all-addresses endpoint
    - Single-BFS computation of addresses from an ego to every node; reject a nonexistent ego leaving
      the current viewpoint unchanged; mark unresolved targets with the unresolved indicator.
    - _Requirements: 10.1, 10.2, 10.3, 10.4_

- [x] 4. Asserted vs derived relationships
  - [x] 4.1 Implement asserted/derived storage, rendering state, and add-relative modes
    - Store parent-child as Primitive_Bloodline_Edge and spouse as Marriage_Edge with
      `derivation_state='derived'` (solid); store direct-label relationships as Asserted_Relationship
      with `derivation_state='asserted'` (dashed); the resolver returns the stored label for asserted
      pairs and computes derived addresses for derived-only paths.
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 6.1, 6.3, 6.4_

  - [x] 4.2 Implement the asserted-upgrade and conflict-detection scan
    - On bloodline-edge creation, detect asserted pairs newly joined by an unbroken bloodline path;
      upgrade to `verified` (render solid, no warning) on match, or `conflict` (retain label, warn
      with both asserted and derived values) on mismatch.
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

  - [x] 4.3 Write property test for asserted-relationship upgrade and conflict detection
    - **Property 17: Asserted-relationship upgrade and conflict detection** — on completion, verified
      with no warning when derived equals asserted; conflict with retained label and both-values
      warning when they differ.
    - Tag: `Feature: vietnamese-family-tree, Property 17`
    - _Validates: Requirements 7.1, 7.4, 7.5, 15.9_

- [x] 5. Node deletion (two-phase) with cascade and neighbor-preservation
  - [x] 5.1 Implement two-phase deletion prompt and cascade strategy
    - `DELETE` returns the two-option choice and mutates nothing; `POST /persons/{id}/delete` with
      `cascade` removes the target and its edges, then transitively removes nodes that became edgeless
      as a result (retaining pre-existing isolates); reject a nonexistent target.
    - _Requirements: 3.4, 15.1, 15.2, 15.3, 15.10_

  - [x] 5.2 Write property test for cascade transitive orphan removal
    - **Property 21: Cascade deletion transitive orphan removal** — target and edges removed, all
      nodes made edgeless by the cascade removed transitively, pre-existing isolates retained.
    - Tag: `Feature: vietnamese-family-tree, Property 21`
    - _Validates: Requirements 15.3_

  - [x] 5.3 Implement neighbor-preservation strategy
    - Compute pre-deletion addresses for affected neighbor pairs; after removing the target, retain
      all former neighbors (even if isolated) and create an asserted edge labeled with the
      pre-deletion address exactly for pairs whose only derived path ran through the target and whose
      address was defined; created edges participate in the upgrade/conflict flow.
    - _Requirements: 15.4, 15.5, 15.6, 15.7, 15.8, 15.9_

  - [x] 5.4 Write property test for neighbor preservation
    - **Property 22: Neighbor preservation** — every former neighbor retained (even if isolated); an
      asserted edge labeled with the pre-deletion address created exactly for cut-node pairs with a
      defined pre-deletion address and for no other pair.
    - Tag: `Feature: vietnamese-family-tree, Property 22`
    - _Validates: Requirements 15.4, 15.5, 15.7, 15.8_

- [x] 6. Authentication, verification, sessions, and ownership
  - [x] 6.1 Implement active credential and bounded-code lifecycles
    - Validate VN phone/email formats; enforce the active password policy and hash passwords;
      verify Google credentials server-side; keep expiring, single-use, rate-limited codes for
      password recovery and person-node claiming only. OTP-only sign-up/sign-in is legacy.
    - _Requirements: 1.1–1.9, 2.1–2.8, 11.1–11.5_

  - [x] 6.2 Write property tests for credential and bounded-code validity
    - **Properties 1–2** — password/Google credentials satisfy their active validation contract;
      recovery/claim codes are accepted iff matching, unexpired, unconsumed, and within limits.
    - Tags: `Feature: vietnamese-family-tree, Property 1` and `Property 2`
    - _Validates: Requirements 1.3, 1.4, 1.8, 1.9, 2.1, 2.2, 2.4–2.6, 11.2–11.5_

  - [x] 6.3 Write property tests for rate and attempt limits
    - Credential attempts and recovery/claim code submissions are rejected after their configured
      limits without exposing account existence.
    - Tag: `Feature: vietnamese-family-tree, Property 2`
    - _Validates: Requirements 2.7, 11.5, 25.1_

  - [x] 6.4 Write property test for identifier validation
    - **Property 3: Identifier validation** — new sign-up accepts valid email only; valid VN phone is
      retained solely for existing legacy-account sign-in/recovery.
    - Tag: `Feature: vietnamese-family-tree, Property 3`
    - _Validates: Requirements 1.1, 1.2, 1.7_

  - [x] 6.5 Implement password/Google sign-up and initial tree journey
    - Create a verified user after password or Google validation and current consent; establish a
      session and create one initial tree (default region Bắc); later trees are created only by an
      explicit authenticated request.
    - _Requirements: 1.1–1.9, 9.2, 13.1, 13.2, 13.3_

  - [x] 6.6 Replace the obsolete single-tree property with explicit multi-tree isolation
    - **Property 19: Initial-tree creation and multi-tree isolation** — sign-up creates one initial
      tree; every later explicit create adds one tree; every operation affects only its supplied
      `treeId`.
    - Tag: `Feature: vietnamese-family-tree, Property 19`
    - _Validates: Requirements 13.2_

  - [x] 6.7 Implement password/Google sign-in, session management, and sign-out
    - Validate password or Google identity; establish a 30-day server-side session in an
      HttpOnly/Secure-in-production/SameSite cookie; use uniform authentication failures; revoke the
      session on sign-out.
    - _Requirements: 2.1–2.5, 2.7, 2.8_

  - [x] 6.8 Implement node invitation and OTP claiming
    - Owner invites a phone/email (15-minute code) for an unclaimed node; verify the code to create a
      `claims` link; reject wrong/expired codes and already-claimed invitations; allow linked-user
      edits of claimed nodes.
    - _Requirements: 11.1, 11.2, 11.3, 11.6, 11.7_

- [x] 7. Authorization and privacy enforcement
  - [x] 7.1 Implement the authentication filter and authorization context
    - Active Next.js Route Handlers resolve the session and apply owner/collaborator/linked-user
      authorization before each protected operation. The Java reference module uses a
      `OncePerRequestFilter`. Both paths leave contents unchanged on rejection.
    - _Requirements: 11.6, 13.4, 13.5_

  - [x] 7.2 Write property test for mutation authorization
    - **Property 18: Mutation authorization** — enforce the Owner/Contributor/Linked/Reader
      capability matrix against the explicit target tree/node; denied operations change nothing.
    - Tag: `Feature: vietnamese-family-tree, Property 18`
    - _Validates: Requirements 11.6, 13.4, 13.5_

  - [x] 7.3 Implement per-field visibility and the privacy filter
    - Store `vis_marital`/`vis_adoption`/`vis_death` (default private); filter private sensitive
      fields server-side from person responses for non-owner/non-linked viewers while returning all
      non-private fields.
    - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.5_

  - [x] 7.4 Write property test for the sensitive-field privacy filter
    - **Property 20: Sensitive-field privacy filter** — private fields are included for Owner,
      Contributor, or the linked subject of that node; other viewers receive projected fields.
    - Tag: `Feature: vietnamese-family-tree, Property 20`
    - _Validates: Requirements 14.3, 14.4, 14.5_

- [x] 8. Checkpoint - backend domain complete
  - Ensure all tests pass, ask the user if questions arise.

- [x] 9. Search_Service
  - [x] 9.1 Implement name and address search
    - Name search: case-folded, diacritic-insensitive substring match; address search: exact match of
      the computed Form_Of_Address relative to a viewpoint; empty result with a no-match indication;
      reject empty/over-100-char queries and inverted birth-year ranges.
    - _Requirements: 16.1, 16.2, 16.6, 16.8_

  - [x] 9.2 Write property test for normalized-substring name search
    - **Property 23: Name search is normalized-substring exact** — returns all and only persons whose
      case-folded, diacritic-stripped name contains the normalized query as a substring.
    - Tag: `Feature: vietnamese-family-tree, Property 23`
    - _Validates: Requirements 16.1_

  - [x] 9.3 Write property test for address-search exact match
    - **Property 24: Address search exact match** — returns all and only persons whose computed
      Form_Of_Address from the viewpoint equals the query term.
    - Tag: `Feature: vietnamese-family-tree, Property 24`
    - _Validates: Requirements 16.2_

  - [x] 9.4 Implement combinable field filters
    - Support gender, side (paternal/maternal vs viewpoint), birth-year range, death status, claimed
      status, and relationship-type filters; combined filters intersect (AND).
    - _Requirements: 16.3, 16.4, 16.5_

  - [x] 9.5 Write property test for filter combination intersection and monotonicity
    - **Property 25: Filter combination is intersection and monotone** — the result equals the
      intersection of per-filter result sets and is a subset of the result when any one filter is
      removed.
    - Tag: `Feature: vietnamese-family-tree, Property 25`
    - _Validates: Requirements 16.4, 16.5_

- [x] 10. Frontend (Next.js)
  - [x] 10.1 Implement auth UI (password/Google sign-up and sign-in, recovery, sign-out)
    - Build password and Google auth flows plus password recovery, with accessible field-level error
      messages from the error envelope. Legacy `IdentifierForm`/`OtpForm` components are not the
      active sign-up/sign-in journey.
    - _Requirements: 1.1–1.9, 2.1–2.8_

  - [x] 10.2 Implement the tree/graph renderer with distinct edge styles and viewpoint switching
    - Render solid (derived), dashed (asserted), and a third distinct style (non-bloodline) edges;
      show person info and computed address on selection; viewpoint selector that re-renders all
      addresses.
    - _Requirements: 5.3, 6.3, 7.2, 8.1, 10.1, 10.2, 12.4, 15.6_

  - [x] 10.3 Implement person CRUD and add-relative UI
    - Forms for create/edit person (with visibility toggles) and for adding relatives in derived
      (solid) vs asserted (dashed) modes; surface upgrade conflict warnings showing both values.
    - _Requirements: 3.1, 3.3, 5.1, 5.2, 6.1, 7.5, 14.1_

  - [x] 10.4 Implement search/filter, claim, region, and deletion-choice UI
    - Search box (name/address) and combinable filter controls bound to the search endpoint; invite
      and claim-by-code flows; region setting control; deletion dialog presenting cascade vs
      neighbor-preservation before any mutation.
    - _Requirements: 11.1, 11.2, 15.1, 15.2, 16.1, 16.2, 16.3, 16.4, 9.5_

  - [x] 10.5 Write property test for the shared diacritic-normalization utility (fast-check)
    - **Property 23: Name search is normalized-substring exact** — validate the shared TS
      case-folding/diacritic-stripping normalizer used by the search UI.
    - Tag: `Feature: vietnamese-family-tree, Property 23`
    - _Validates: Requirements 16.1_

- [x] 11. In-application Help_System
  - [x] 11.1 Implement the Help_System content and navigation
    - Provide a help entry point from the main interface with a section for each required topic
      (solid vs dashed lines; adding derived and asserted relatives; how address is computed; changing
      the viewpoint; claiming a node; selecting a region); each topic reachable from the entry point
      and rendered within 2 seconds.
    - _Requirements: 17.1, 17.2, 17.3, 17.4, 17.5_

- [x] 12. Accessibility implementation
  - [x] 12.1 Implement accessibility features
    - Text scaling 100–200% without loss of content/functionality applied to subsequently rendered
      screens; WCAG-aligned contrast (≥4.5:1 normal, ≥3:1 large); ≥44×44 CSS-px touch targets;
      programmatic name/role/value on every control; full keyboard navigation reaching every control.
    - _Requirements: 18.1, 18.2, 18.3, 18.4, 18.5, 18.6_

  - [x] 12.2 Write accessibility tests
    - Automated audits (e.g., axe-core) for programmatic name/role/value (18.5) and contrast (18.3);
      layout assertions for touch-target size (18.4) and text scaling 100–200% without content loss
      (18.1, 18.2); keyboard-traversal tests for full reachability (18.6).
    - _Requirements: 18.1, 18.2, 18.3, 18.4, 18.5, 18.6_

- [x] 13. Integration and performance verification
  - [x] 13.1 Write integration tests for active authentication and bounded-code flows
    - Verify password and Google auth/session behavior; mock recovery/claim delivery where needed;
      cover sign-up→session→tree journey and invite→claim; assert no half-created session/claim on
      credential or provider failure.
    - _Requirements: 1, 2, 11.1_

  - [x] 13.2 Write performance benchmarks on a generated 1,000-node tree
    - Single-pair address < 1s; viewpoint all-addresses < 2s; search < 2s; help render < 2s;
      asserted-upgrade render < 1s.
    - _Requirements: 8.1, 10.2, 16.7, 17.3, 7.2_

- [x] 14. Final checkpoint - full system verification
  - Ensure all tests pass, ask the user if questions arise.

- [x] 15. Tree-level read authorization and sharing (Phase 1 — security critical)
  - [x] 15.1 Add sharing schema and owner sharing/token endpoints
    - `V5` migration: `trees.sharing` (default `private`) and `trees.living_redaction` (default
      true); new `tree_share_tokens` table (token hashed at rest). Add `PATCH /trees/{treeId}/sharing`,
      `POST`/`DELETE /trees/{treeId}/share-token`, owner-only.
    - _Requirements: 19.1, 19.5, 19.8_
  - [x] 15.2 Enforce read access on every read endpoint
    - Add `requireReadAccess(treeId, shareToken)` to `GET /persons/{id}`, tree view, search, and
      viewpoint-addresses endpoints; resolve `X-Share-Token`; return uniform `403 NOT_AUTHORIZED`
      that does not reveal tree existence. Closes the current unauthenticated read path in
      `PersonController.read`.
    - _Requirements: 19.2, 19.3, 19.4, 19.6, 19.7, 25.4_
  - [x] 15.3 Write property test for tree read-access enforcement
    - **Property 26: Tree read-access enforcement** — a read is permitted iff (mode, role,
      token-validity) is an allowed combination; denied reads return no node/edge data.
    - Tag: `Feature: vietnamese-family-tree, Property 26`
    - _Validates: Requirements 19.3, 19.4, 19.6, 19.7_

- [x] 16. Living-person protection (Phase 1)
  - [x] 16.1 Implement living derivation, redaction projection, and per-tree toggle
    - Derive Living_Person (`death_status=false` AND (`birth_year` null OR within 100 years)); apply
      redaction in the person projection for non-privileged viewers when the tree's
      `living_redaction` is enabled (omit birth year/order, placeholder name) unless the field is
      public; keep node identity/edges for rendering. Add `PATCH /trees/{treeId}/living-redaction`.
    - _Requirements: 20.1, 20.2, 20.3, 20.4, 20.5_
  - [x] 16.2 Write property test for living-person redaction
    - **Property 27: Living-person redaction** — fields redacted iff Living_Person and viewer
      non-privileged and field not public; not-living persons never redacted by this rule.
    - Tag: `Feature: vietnamese-family-tree, Property 27`
    - _Validates: Requirements 20.1, 20.2, 20.3_

- [x] 17. Extended field visibility (Phase 1)
  - [x] 17.1 Add name/birth-year/photo visibility and extend the projection
    - `V6` migration: `persons.vis_name`, `vis_birth_year` (default `public`), `vis_photo` (default
      `private`). Extend `PersonResponse` projection (private name → placeholder; private birth year → omitted; private
      photo → omitted) and the visibility PATCH endpoint; allow owner and linked user to set them.
    - _Requirements: 21.1, 21.2, 21.3, 21.4, 21.5_
  - [x] 17.2 Write property test for extended field-visibility filter
    - **Property 28: Extended field-visibility filter** — governed field included iff privileged or
      public; private name → placeholder for non-privileged viewers.
    - Tag: `Feature: vietnamese-family-tree, Property 28`
    - _Validates: Requirements 21.3, 21.4_

- [x] 18. Personal data rights (Phase 2)
  - [x] 18.1 Implement export, erase, and account deletion
    - `GET /me/nodes/{personId}/export` (JSON of node + incident edges); `POST
      /me/nodes/{personId}/erase` (`delete` via Requirement 15 flow, or `anonymize`);
      `DELETE /me/account` (cascade owned tree, persons, edges, images; revoke sessions). Subject-only
      authorization; audit each operation.
    - _Requirements: 22.1, 22.2, 22.3, 22.4, 22.5_
  - [x] 18.2 Write property test for data-rights subject-only access
    - **Property 29: Data-rights subject-only access** — succeeds iff requester is the data subject;
      otherwise rejected with no change.
    - Tag: `Feature: vietnamese-family-tree, Property 29`
    - _Validates: Requirements 22.1, 22.3, 22.4, 22.5_

- [x] 19. Terms of Service, Privacy Policy, and consent (Phase 2)
  - [x] 19.1 Implement legal documents, consent capture, and re-acceptance gate
    - `V7` migration: `legal_documents`, `user_consents`. Serve `/legal/tos` and `/legal/privacy`
      (public). Require ToS/Privacy acceptance in the active password/Google sign-up flow (record version +
      timestamp; refuse account creation without it); force re-acceptance before next mutation on a
      version bump; show the owner the lawful-basis notice when adding/editing a non-self node.
    - _Requirements: 23.1, 23.2, 23.3, 23.4, 23.5, 23.6_
  - [x] 19.2 Write property test for the consent gate at sign-up
    - **Property 30: Consent gate at sign-up** — account/tree created iff valid current-version
      consents supplied; absent/stale consent creates nothing.
    - Tag: `Feature: vietnamese-family-tree, Property 30`
    - _Validates: Requirements 23.2, 23.3, 23.4_

- [x] 20. Abuse prevention and audit logging (Phase 2)
  - [x] 20.1 Implement rate limiting and the audit log
    - Per-identifier and per-IP rate limit on verification-code issuance (`429 TOO_MANY_ATTEMPTS`,
      no identifier disclosure); `V8` migration `audit_log`; record auth events, sharing/visibility
      changes, data-rights operations, and deletions with actor/action/target/timestamp; never log
      codes or tokens in plaintext.
    - _Requirements: 25.1, 25.2, 25.3, 25.4_

- [x] 21. Person photos (after Phase 1)
  - [x] 21.1 Provision object storage and the photo schema
    - Add MinIO to `docker-compose.yml`; `StorageService` interface (put/get/delete/signed-URL) with
      an S3-compatible implementation; `V9` migration `person_photos` (object key + metadata, at most
      one primary per person). Binary content stays out of Postgres.
    - _Requirements: 24.7_
  - [x] 21.2 Implement upload, primary selection, gated serving, and deletion
    - `POST /persons/{id}/photos` (multipart): validate type (JPEG/PNG only) and size, re-encode to
      strip EXIF/GPS, and reject WebP or any other unsupported type. `PATCH .../primary`; `GET .../{photoId}` gated by
      `requireReadAccess` + `vis_photo` + living rules; `DELETE .../{photoId}`; cascade photo deletion
      on person delete/erase. Owner and linked user only for mutations.
    - _Requirements: 24.1, 24.2, 24.3, 24.4, 24.5, 24.6, 24.8_
  - [x] 21.3 Write property test for photo upload validation and metadata stripping
    - **Property 31: Photo upload validation and metadata stripping** — stored iff type/size valid;
      stored image carries no EXIF/geolocation; at most one primary per person.
    - Tag: `Feature: vietnamese-family-tree, Property 31`
    - _Validates: Requirements 24.1, 24.2, 24.3, 24.4_

- [x] 22. Checkpoint - privacy, photos, and compliance verification
  - Ensure all new and existing tests pass against the Docker database; confirm the read-access gate,
    living-person redaction, consent gate, and photo access controls behave end-to-end.

- [x] 23. Account display names (CGP-USER-001)
  - [x] 23.1 Add nullable account display-name persistence and validation
    - Add forward migration V25, Drizzle/Java mappings, normalized Unicode validation, and legacy-null compatibility without syncing Person names.
  - [x] 23.2 Extend signup, Google, session, and self-profile contracts
    - Require display name for new password/Google accounts, preserve existing Google names, expose it in session, and add self-only `PATCH /me/profile`.
  - [x] 23.3 Present account identities and protect the collaboration roster
    - Update settings, invitation, tree settings, roster UI/prototypes; return owner plus contributors only to active tree members and never use UUID labels.

- [x] 24. Reusable collaboration invitation links (CGP-COLLAB-001)
  - [x] 24.1 Add source-invitation persistence and idempotent generic requests
    - Add forward migration V26 and Drizzle mapping for `source_invitation_id`; enforce one request per source invitation and requester.
  - [x] 24.2 Unify code/link acceptance and bind email invitations
    - Share validation and acceptance logic, use requester IDs for approval, return safe invitation views, apply uniform invalid-link errors, and rate-limit joins.
  - [x] 24.3 Add invitation/auth/copy-link UI and synchronized prototypes
    - Preserve internal return paths across sign-in/sign-up, show invitation reason toast, add request/cancel/pending states, and expose copy controls for both code and link.

- [x] 25. Active Next.js business-conformance remediation (CGP-CONFORMANCE-001)
  - [x] 25.1 Make authorization explicitly multi-tree and capability-based
    - Remove first-owned-tree fallback state; return tree `accessRole` and per-person capabilities;
      enforce Owner/Contributor/Linked/Reader permissions on every active Route Handler.
    - _Requirements: 3, 11, 13, 14, 19, 20, 21, 24_
  - [x] 25.2 Complete password recovery and authenticated node linking
    - Implement hashed, single-use, attempt-limited reset codes; revoke old sessions and create one
      fresh session. Mount “Xác nhận đây là tôi” and bind verification to session identity.
    - _Requirements: 2, 11, 17, 25_
  - [x] 25.3 Centralize privacy projection, consent v2, and data rights
    - Reuse one Living_Person/privacy projector across every read surface; add legal v2
      re-acceptance and lawful-basis notice; implement own-node export/erase and all-owned-tree
      account deletion with photo cleanup.
    - _Requirements: 14, 19–25_
  - [x] 25.4 Repair graph, search, photo, and invitation invariants
    - Make add-relative atomic; remove implicit edge replacement and co-parent marriage inference;
      add relationship update/delete; align search response; compensate photo failures; hash new
      invitation codes and rate-limit joins by User and IP.
    - _Requirements: 3–7, 12, 15, 16, 24–26_
  - [x] 25.5 Synchronize production UI, Help, prototypes, and conformance evidence
    - Expose only capability-permitted actions; add claim/settings/consent/data-rights prototypes;
      keep prototype data isolated; run targeted/full tests and the three-viewport UI audit.
    - _Requirements: 11, 17, 18, 22, 23_

- [x] 26. Populated tree workspace mobile UX migration (CGP-WORKSPACE-UX-001)
  - [x] 26.1 Replace focus/list/graph composition with responsive list/graph modes
    - Persist the versioned two-mode preference, keep both tab panels mounted and inert the inactive
      panel, and use a container-query split workspace on wide containers.
  - [x] 26.2 Add compact context, complete viewpoint picker, and capability action tray
    - Keep every projected person searchable without diacritics; target add-relative at the selected
      person or ego; expose sensitive actions only through server-provided capabilities.
  - [x] 26.3 Reformat graph surfaces and expose non-gesture controls
    - Retain the existing graph engine/privacy/edge semantics while applying semantic visual tokens
      and labelled mobile, tablet, and desktop control presentations.
  - [x] 26.4 Replace populated-workspace checklist/tour with schema-4 Coach marks
    - Resolve copy from canonical Help topics, skip unavailable anchors, persist completed/skipped,
      migrate earlier guidance state, and allow an explicit manual replay.
  - [x] 26.5 Synchronize `/prototype/tree`, remove the standalone mobile concept, and verify roles
    - Cover Owner, Contributor, Linked, and Reader; update targeted component/Playwright contracts;
      run the broad three-viewport prototype audit before visual polish.
  - [x] 26.6 Extend Coach marks into progressive, surface-triggered chapters
    - Migrate guidance to schema 5 with independent overview/actions/graph/person decisions; resolve
      capability-aware anchors from canonical Help; route typed replay to one chapter; and cover the
      shared `/prototype/tree` interactions without auto-opening a surface or mutating tree state.
  - [x] 26.7 Reformat workspace panels and contextual Coach layers
    - Give action, picker, and person surfaces fixed chrome with exactly one internal scroll owner;
      float contextual Coach content outside the scrolling body; share person-mode chrome/body with
      separated destructive action and typed replay; use the mobile/tablet action bottom sheet and
      exact 4×2 graph-control grid while keeping desktop compact. Preserve capability, privacy, API,
      and graph-engine behavior; reuse production components in `/prototype/tree` and cover
      responsive scroll ownership in targeted tests and the three-viewport audit.

## Notes

- Tasks marked with `*` are optional test sub-tasks and can be skipped for a faster MVP; core
  implementation tasks are never optional.
- Each PBT sub-task implements exactly one design Property (1–31), is tagged
  `Feature: vietnamese-family-tree, Property {number}`, runs ≥100 generated cases, and is placed next
  to the implementation it validates to catch errors early.
- jqwik covers the Java reference domain layer; fast-check covers active/shared TypeScript logic.
  Google identity, recovery/claim delivery providers, and persistence are mocked/in-memory where
  relevant for property tests.
- Every requirement (1–26) and every correctness property (1–31) is referenced by at least one task.
- Checkpoints (tasks 8, 14, and 22) provide incremental validation points.
- Tasks 15–22 (Requirements 19–25) extend the original plan with tree-level read authorization,
  living-person protection, extended field visibility, data-subject rights, consent capture, abuse
  prevention/audit, and person photos. Phase 1 (tasks 15–17) is security-critical and should land
  first; Phase 2 (tasks 18–20) adds rights/consent/hardening; photos (task 21) come after Phase 1 so
  they inherit the tightened access model.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.3"] },
    { "id": 1, "tasks": ["1.2", "1.4"] },
    { "id": 2, "tasks": ["2.1"] },
    { "id": 3, "tasks": ["2.2", "2.5", "6.1"] },
    { "id": 4, "tasks": ["2.9", "6.5"] },
    { "id": 5, "tasks": ["2.3", "2.4", "2.6", "2.7", "2.8", "2.10", "3.1", "6.2", "6.3", "6.4", "6.6", "6.7", "6.8"] },
    { "id": 6, "tasks": ["3.3", "3.2", "7.1"] },
    { "id": 7, "tasks": ["3.7", "3.12", "3.4", "3.5", "3.6", "7.2", "7.3"] },
    { "id": 8, "tasks": ["3.9", "3.8", "4.1", "7.4"] },
    { "id": 9, "tasks": ["3.10", "3.11", "4.2", "5.1"] },
    { "id": 10, "tasks": ["4.3", "5.3", "5.2", "9.1"] },
    { "id": 11, "tasks": ["5.4", "9.4", "9.2", "9.3"] },
    { "id": 12, "tasks": ["9.5", "10.1", "10.2", "10.3"] },
    { "id": 13, "tasks": ["10.4", "10.5", "11.1", "12.1"] },
    { "id": 14, "tasks": ["12.2", "13.1", "13.2"] }
  ]
}
```

### Privacy, Photos, and Compliance Extension (tasks 15–22)

These waves extend the graph above; they depend on the completed foundation (auth, Graph_Store,
person projection, and the Docker database) and are otherwise internally ordered schema →
enforcement → property test.

```json
{
  "waves": [
    { "id": 15, "tasks": ["15.1", "16.1", "17.1"] },
    { "id": 16, "tasks": ["15.2"] },
    { "id": 17, "tasks": ["15.3", "16.2", "17.2"] },
    { "id": 18, "tasks": ["19.1", "20.1", "21.1"] },
    { "id": 19, "tasks": ["18.1", "21.2"] },
    { "id": 20, "tasks": ["18.2", "19.2", "21.3"] },
    { "id": 21, "tasks": ["22"] }
  ]
}
```
