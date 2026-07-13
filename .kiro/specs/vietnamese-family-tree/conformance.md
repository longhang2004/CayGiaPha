# Active Next.js Conformance Matrix

Last reviewed: 2026-07-13  
Runtime in scope: `frontend/` Next.js Route Handlers, TypeScript services, React UI, Drizzle/PostgreSQL.  
Reference only: `backend/` Spring Boot. A historical checked task is not proof of current conformance.

## Status vocabulary

- `CONFORMANT`: active runtime and current automated evidence satisfy the requirement.
- `PARTIAL`: material behavior exists, but one or more acceptance criteria or surfaces are missing.
- `GAP`: the active runtime contradicts or does not expose the required behavior.
- `EXTERNAL`: completion needs manual/expert evidence outside automated runtime verification.

## Requirement matrix

| Req | Active implementation/evidence anchor | 2026-07-13 status | Required remediation/evidence |
|---:|---|---|---|
| 1 | `/api/v1/auth/signup`, `POST /auth/google`; auth/new-tree/legacy-phone/Google callback tests | CONFORMANT | New accounts are email/password or verified-email Google accounts with consent and one initial tree; phone registration is rejected while legacy phone sign-in/recovery remains covered. Retired Google GET callback routes cannot bypass consent. |
| 2 | `passwordReset.ts`; reset request/confirm route tests; `ForgotPasswordFlow` | CONFORMANT | Request is enumeration-safe; codes expire after 15 minutes/five attempts; confirm revokes old sessions and returns a fresh 30-day session. |
| 3 | `/api/v1/persons`, `PersonService`, `PersonForm`; person/route property/component tests | CONFORMANT | Every create/edit names the target `treeId`; integer/death fields are validated and persisted; forms show the lawful-basis/responsibility notice and obey server capabilities. |
| 4 | `RelationshipService`; relationship mutation tests | CONFORMANT | Primitive edges are never implicitly replaced, co-parent marriage is not inferred, exact duplicates fail clearly, and PATCH/DELETE target one relationship id. |
| 5 | atomic relative service/route; `AddRelativeForm`; `PersonForm`; service/component tests | CONFORMANT | Person and primitive/asserted edge are created in one transaction, so edge validation cannot leave an orphan Person. |
| 6 | asserted relationship service/route; authorization and relationship tests | CONFORMANT | Asserted labels stay directed and opaque; invalid/duplicate mutations fail before writes and Contributor uses the content-editor capability. |
| 7 | asserted upgrade scanner; relationship upgrade/conflict tests | CONFORMANT | A newly resolvable asserted label becomes `verified` on a match or remains preserved as `conflict` with an explicit warning. |
| 8 | kinship resolver and property tests | CONFORMANT | Preserve derived-only traversal and three-region regression coverage. |
| 9 | region resolver/configuration/property tests | CONFORMANT | Preserve Bắc/Trung/Nam coverage. |
| 10 | viewpoint controls/address routes | CONFORMANT | Preserve explicit target-tree read authorization. |
| 11 | `claim.ts`; authenticated claim route/page; `ClaimFlow`; claim service/route/page tests; `/prototype/claim/[personId]` | CONFORMANT | Owner invitation and recipient verification are separate; verification accepts only `{code}` and binds the node to signed-in verified identity. |
| 12 | non-bloodline service/renderer; relationship PATCH/DELETE; authorization tests | CONFORMANT | Marriage and directed social/asserted edges retain their semantics; content editors may mutate them by id without implicit overwrite. |
| 13 | `authorization.ts`; `GET /trees`; tree/person capabilities; auth initial-tree and 100-run multi-tree property tests; four-role UI tests | CONFORMANT | Session/auth context contains no owned-tree fallback. Owned, contributed and linked trees are explicit; later creates append trees; mutations authorize the request's `treeId`; UI actions come from tree/person capabilities. |
| 14 | `privacy.ts`; tree/person/search/photo/upcoming projections; privacy unit + 100-run property tests | CONFORMANT | One projector classifies the exact living boundary, treats Contributor as trusted, classifies Linked per node, and omits visibility metadata from projected readers. |
| 15 | transactional deletion services; `DeletionDialog`; `DataRightsPanel`; graph/resolver property tests; deletion tests | CONFORMANT | Cascade/preserve and whole-tree deletion are relationally atomic, clean photo objects after commit, and preserve graph invariants. |
| 16 | search service/client/component; search and privacy property tests | CONFORMANT | `bloodline` is canonical, `noMatches` is explicit, results use the shared projector, and the 1,000-node boundary is covered under two seconds. |
| 17 | HelpGuide/help topics/onboarding; claim topic unit/Playwright anchors | CONFORMANT | Canonical Help now documents the mounted authenticated “Xác nhận đây là tôi” flow separately from Owner and collaboration invitations. |
| 18 | CGP primitives/a11y tests; keyboard/text-scaling/axe suites; role/consent/welcome prototypes; three-viewport audit | CONFORMANT / EXTERNAL | Automated keyboard, focus restoration, dark mode, 200% text and overflow checks pass. Screen-reader and qualified accessibility review remain external. |
| 19 | `authorization.ts`; `privacy.ts`; tree/person/photo/search/upcoming routes; authorization/privacy tests | CONFORMANT | Explicit tree access precedes one role-aware projection on every active person-data read surface. |
| 20 | `isLivingPerson`; `projectPerson`; privacy boundary/property tests | CONFORMANT | A person born exactly 100 years ago remains living; public-field exceptions and private-field redaction are centralized. |
| 21 | visibility route; `projectPerson`; authorization/privacy tests | CONFORMANT | Owner/linked subject change visibility, Contributor receives trusted read, and projected viewers receive no visibility metadata. |
| 22 | `DataRightsService`; `/me/nodes*`; `/me/account`; `DataRightsPanel`; service/route/component tests | CONFORMANT | Linked nodes are discoverable/exportable/correctable/erasable; anonymization clears identifiers/dates/photos/claim, and account deletion handles every owned tree while preserving contributed trees. |
| 23 | canonical legal v2 content/pages/migration; consent endpoint/dialog; lawful-basis notice; tests | CONFORMANT / EXTERNAL | Runtime versioning, reacceptance and notice are implemented; qualified legal review of the wording remains external. |
| 24 | photo projector/list/serve; photo service tests; transactional person/account/tree cleanup | CONFORMANT | Upload compensates storage when persistence fails, primary selection is transactional, and deletion cleanup is idempotent after commit. |
| 25 | hashed auth/Google/reset/claim limiter keys; fail-closed/generic-error tests; escaped email templates; sanitized-log review | CONFORMANT | Sensitive auth/code routes fail closed by hashed identity and IP where identity is available; unexpected 500s are generic; dynamic email HTML is escaped; runtime logs never attach raw provider/error/PII/token payloads. |
| 26 | invitation service/routes/UI and invitation tests | CONFORMANT | New codes are hashed at rest, unexpired legacy plaintext codes retain a bounded fallback, join is limited by User and IP, and production routes contain no prototype identity branches. |

## Completion gate

Task 25 may be marked complete only when every active-runtime row is `CONFORMANT` or explicitly
`EXTERNAL`, each status names current automated/manual evidence, and the following fresh commands
have succeeded from `frontend/`:

```bash
pnpm test
pnpm run typecheck
pnpm run lint
pnpm run build
npx playwright test
```

The prototype audit must cover 1280×800, 768×1024, and 375×667 plus 200% text. Findings are
reported before any optional visual polish is performed.

## Fresh verification evidence

- `pnpm test`: 100 files, 426 tests passed.
- `pnpm run typecheck`: passed.
- `pnpm run lint`: passed with only repository-approved `<img>` warnings.
- `pnpm run build`: passed; all production and prototype routes compiled/prerendered.
- `pnpm exec playwright test tests/e2e/prototype-audit.spec.ts`: 48 scenarios passed across
  desktop, tablet and mobile; findings are recorded in
  `.agents/design/CGP-CONFORMANCE-001/ui-audit-2026-07-13.md`.
- Targeted prototype suite for home, Help, welcome, guidance, recovery, claim, four roles,
  settings, consent and legal routes: 43 passed.
- `pnpm exec playwright test tests/e2e/prototype.spec.ts`: all 75 scenarios passed, including
  homepage/Help navigation, recovery, claim, four-role capabilities, data rights, consent, legal,
  early-access welcome behavior, keyboard interaction, focus restoration, dark mode, 200% text and
  viewport-overflow checks.
- `mvn test -Dtest=DatabaseConnectionIntegrationTest`: passed against PostgreSQL 16 and applied
  all 27 Flyway migrations. The full inactive Java suite is not a runtime gate and is not runnable
  under the host Java 26 because its pinned ByteBuddy supports Java through 23; use Java 21 for it.
