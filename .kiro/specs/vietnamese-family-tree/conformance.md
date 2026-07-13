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
| 1 | `/api/v1/auth/signup`, `/auth/google`, auth flows/tests | PARTIAL | Enforce email-only new registration; retain legacy phone compatibility tests. |
| 2 | signin/session services; forgot-password UI | GAP | Add reset request/confirm, session revocation/fresh session, hashed rate-limit keys, safe logging. |
| 3 | `/api/v1/persons`, `PersonService`, `PersonForm` | PARTIAL | Explicit `treeId`, integer/death-field validation, lawful-basis notice, capability tests. |
| 4 | `RelationshipService`, relationship property tests | PARTIAL | Remove destructive implicit replacement and co-parent marriage inference; transactional update/delete. |
| 5 | `AddRelativeForm`, person/relationship routes | GAP | Add atomic create-relative command; no orphan Person on edge failure. |
| 6 | asserted relationship service/renderer | PARTIAL | Atomic invalid-label behavior and Contributor coverage. |
| 7 | asserted upgrade service/property tests | PARTIAL | Re-run conflict/upgrade properties after transactional relationship changes. |
| 8 | kinship resolver and property tests | CONFORMANT | Preserve derived-only traversal and three-region regression coverage. |
| 9 | region resolver/configuration/property tests | CONFORMANT | Preserve Bắc/Trung/Nam coverage. |
| 10 | viewpoint controls/address routes | CONFORMANT | Preserve explicit target-tree read authorization. |
| 11 | claim service/component tests | GAP | Mount “Xác nhận đây là tôi”; bind destination to signed-in account; add claim route/prototype. |
| 12 | non-bloodline service/renderer | PARTIAL | Add Contributor capability and relationship update/delete coverage. |
| 13 | authorization/session/tree routes | GAP | Remove `ownedTreeId`; implement explicit multi-tree role/capability contracts and isolation property. |
| 14 | tree/person response filtering | GAP | Use one privacy projector; Contributor trusted read; hide visibility metadata from projected readers. |
| 15 | deletion service/dialog/tests | PARTIAL | Contributor capability, linked own-node strategy UI, transaction and photo cleanup. |
| 16 | search service/client | GAP | Align `bloodline`, `noMatches`, privacy projection, and 1,000-node performance evidence. |
| 17 | HelpGuide/help topics/onboarding | PARTIAL | Add reachable node-linking topic only after production flow is mounted. |
| 18 | CGP primitives/a11y tests/prototypes | PARTIAL / EXTERNAL | Verify new flows at 200%, keyboard/dark mode; screen-reader/expert review remains external. |
| 19 | authorization/tree read routes | GAP | Add Contributor/Linked reads and uniform explicit-tree enforcement on all read surfaces. |
| 20 | duplicated living-person checks | GAP | Centralize exact 100-year boundary and public-field exception. |
| 21 | visibility route/person responses | GAP | Central projector; Owner/linked-subject mutation only; Contributor trusted read. |
| 22 | data-rights services/routes | GAP | Add discoverable UI/listing; full anonymization; all-owned-tree account deletion and cleanup. |
| 23 | consent/legal services/pages | GAP / EXTERNAL | Publish canonical v2, re-acceptance path and notice; legal counsel review remains external. |
| 24 | photo service/gallery | GAP | Apply projection to list/serve; Contributor/Linked capability; upload compensation and primary transaction. |
| 25 | rate limiter/audit/error/provider services | GAP | Fail closed on sensitive routes, hash identifier keys, sanitize errors/logs/email HTML. |
| 26 | invitation service/routes/UI | PARTIAL | User+IP join limits, hash new codes with expiring legacy fallback, remove production prototype branches. |

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
