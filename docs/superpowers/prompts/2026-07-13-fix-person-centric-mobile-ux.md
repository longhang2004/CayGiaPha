# Gemini Execution Prompt — Fix Person-Centric Mobile UX

## Role

You are a senior frontend engineer and test engineer working in the CayGiaPha repository.

## Objective

Repair the current person-centric mobile UX implementation so every verified review finding below is resolved and the repository is ready for independent Codex verification. Make the smallest coherent corrections. Do not redesign the approved person-centric direction.

## Repository context

- Stack: Next.js 14 App Router, React 18, TypeScript, Vitest, Testing Library and Playwright.
- Read `AGENTS.md`, `frontend/docs/ui/INDEX.md`, `frontend/docs/ui/README.md`, and the relevant Kiro requirements/design/tasks before editing.
- Approved plan: `docs/superpowers/plans/2026-07-13-person-centric-mobile-ux.md`.
- Production UI changes must update corresponding prototype mirrors in the same patch.
- Always use HTML `<img>`; never use `next/image`.
- The worktree is dirty. Preserve all user and workflow changes.
- Do not commit, create branches, or create scratch scripts.

## Verified findings to repair

### 1. Native form submission and review flow — P0

`PersonForm` and `AddRelativeForm` do not prevent native form submission, store a React `FormEvent` in state, and reuse it after the review step. Vitest emits `HTMLFormElement.prototype.requestSubmit` errors.

Required outcome:

- Call `preventDefault()` at the form boundary.
- Never store or reuse SyntheticEvent/FormEvent objects.
- Separate opening the review screen from the async persistence function.
- Review confirmation performs exactly one mutation.
- Back, retry and field-level errors retain all valid draft fields.
- Add tests that fail if native submission occurs or confirmation causes duplicate mutations.

### 2. Safe cancellation and accurate review copy — P1

Dirty-state detection currently covers only a few fields.

Required outcome:

- `PersonForm` detects meaningful changes across every editable field, including gender, birth/death fields, relationship state and photo.
- `AddRelativeForm` detects changes to mode, targets, relationship type, asserted label, marital state and all new-person fields.
- Cancel warns whenever meaningful work would be lost.
- Review text correctly distinguishes creating a new person from linking existing people.
- Relationship direction and Vietnamese relationship labels must be accurate.

### 3. Keyboard accessibility for focus/list views — P1

`TreeFocusView` and `TreePeopleListView` use clickable `<div>` elements without keyboard semantics.

Required outcome:

- Use semantic buttons/links where possible.
- Otherwise implement complete role, focus, Enter/Space and visible-focus behavior.
- Give the member search input a real accessible label.
- Preserve nested action behavior without accidental row activation.

### 4. Accessible view switcher — P1

The view tabs are fixed at 36px and do not implement complete keyboard tab behavior.

Required outcome:

- Every target is at least 44×44 CSS px.
- Implement ArrowLeft, ArrowRight, Home and End navigation.
- Implement roving `tabIndex`, `aria-selected`, `aria-controls` and matching tab panels, or reuse the repository’s existing accessible CGP Tabs pattern.
- Preserve browser view-mode preference and safe fallback.

### 5. Correct address label/search contract — P1

New workspace code treats `Address.relation` as a string, but it is `CanonicalRelation | null`. Current backend responses may use boolean `resolved` plus a structured `relation`.

Required outcome:

- Use existing `addressLabel` or `contextualAddressLabel` helpers.
- Display useful unresolved fallbacks.
- Search by Vietnamese form of address using valid current `Address` shapes.
- Replace invalid cast-based test fixtures with contract-valid fixtures.

### 6. Address refresh and stale requests — P1

`useViewpointAddresses` only notices changes to person/relationship counts. Same-count relationship edits can leave kinship terms stale; clearing ego can leave loading/request state inconsistent.

Required outcome:

- Use the existing tree-structure revision signal or an equally stable revision already present in the app.
- Refetch after same-count relationship edits.
- Stale/aborted requests never overwrite the current viewpoint.
- Clearing ego resets addresses, loading, error and request identity safely.
- Add focused tests for these cases.

### 7. Labelled mobile core actions — P1

Help, add-person and graph navigation labels are still hidden on mobile.

Required outcome:

- Keep stable, visible Vietnamese labels for tree list/back, Help, add person, zoom, reset and center actions.
- Gesture is only a shortcut.
- Do not hide the sole core-action label with `hide-on-mobile`.
- Preserve capability visibility for Owner, Contributor, Linked and Reader.
- Do not expose actions beyond server-provided capability.

### 8. Responsive and 200% text regressions — P1

Verified screenshots show modal/panel overlap, Help collapsing into an unusably narrow column and empty-state clipping.

Required outcome:

- Verify 320, 375 and 430px widths.
- Verify 100–200% text, light/dark mode and reduced motion.
- The view switcher must not cover content.
- Modals/panels must not overlap navigation or each other.
- Help must retain a readable single-column mobile layout.
- Empty states must wrap and scroll without clipping required controls/content.

### 9. Guidance and failing Playwright tests — P1

Current broad Playwright has four failures:

- Completed guidance state still shows “Bắt đầu từng bước”.
- Graph guidance safe-area tests cannot find `.tree-graph__nav-controls` on desktop, tablet or mobile.

Required outcome:

- Follow the approved no-forced-tour direction.
- Remove obsolete automatic graph-covering guidance instead of preserving overlays solely for legacy tests.
- Inline, dismissible guidance may remain.
- Update production and prototype behavior together.
- Update obsolete tests to assert the approved behavior; do not weaken unrelated assertions merely to pass.

### 10. Telemetry coverage and privacy — P1

The telemetry whitelist is acceptable, but coverage is incomplete.

Required outcome:

- Track `ux_help_open`, `ux_recovery_used`, find-person and change-viewpoint start/complete at the actual user action.
- Payload contains enums only.
- Never send IDs, names, search queries, invite codes, images or family data.
- Use a real access role when it is already available; otherwise `unknown` is acceptable.
- Add tests proving payload redaction and event coverage.

### 11. Typecheck and repository hygiene

- Fix the TypeScript error in `frontend/tests/e2e/family-tree.spec.ts` without unsafe `evaluate(node.click())` and without weakening the flow.
- Fix trailing whitespace in touched files.
- Do not create `fix_*.js`, `test_output.txt`, generated reports, dependency changes or package-lock changes.

### 12. Evidence-based audit report

Update `docs/research/ux-baseline-2026-07-13/person-centric-post-implementation-audit.md` so it reports only checks actually run and their real results. Do not claim completion or zero remaining issues unless every required gate passes.

## Allowed scope

- `frontend/src/components/person/PersonForm.tsx` and its test
- `frontend/src/components/person/AddRelativeForm.tsx` and its test
- `frontend/src/components/tree-page/TreeWorkspaceViewSwitcher.tsx` and its test
- `frontend/src/components/tree-page/TreeFocusView.tsx`
- `frontend/src/components/tree-page/TreePeopleListView.tsx`
- `frontend/src/components/tree-page/TreeWorkspaceSurface.tsx` and its test
- `frontend/src/components/tree-page/useViewpointAddresses.ts` and its test
- `frontend/src/components/tree-page/TreePageHeader.tsx` and capability tests
- `frontend/src/components/graph/TreeGraph.tsx`, `TreeGraphControls.tsx`, `GraphLegend.tsx` and focused tests
- `frontend/src/lib/tree-workspace/people.ts` and tests
- `frontend/src/lib/tree-workspace/viewMode.ts` and tests only if needed
- `frontend/src/lib/analytics/uxEvents.ts` and tests
- `frontend/src/components/help/HelpGuide.tsx`, `HelpNav.tsx` and tests
- `frontend/src/components/guidance/` only where necessary for the approved guidance change
- `frontend/src/app/tree/page.tsx`, `frontend/src/app/tree/[id]/page.tsx` and corresponding prototype mirrors
- `frontend/src/content/help/` only if needed for canonical contextual Help
- `frontend/src/styles/_02_typography.scss`, `_03_tree_workspace.scss`, `_08_modals_auth.scss`
- Relevant E2E tests under `frontend/tests/e2e/`
- `.kiro/specs/vietnamese-family-tree/requirements.md`, `design.md`, `tasks.md` only for already-approved UX invariants
- `docs/research/ux-baseline-2026-07-13/person-centric-post-implementation-audit.md`

## Prohibited changes

- Do not modify `AGENTS.md`, `.agents/execution-routing-harness.md`, `.agents/multi-model-playbook.md`, `.agents/bin/`, delegation documentation or `.agents/memory.md`.
- Do not change REST APIs, database schema, backend, auth/privacy/capability contracts or kinship rules.
- Do not redesign unrelated page families.
- Do not delete or rewrite unrelated dirty-worktree files.
- Do not commit or create a branch.

## Acceptance criteria

- Native submission is prevented and review confirmation performs exactly one API mutation.
- Back/edit/error paths retain every valid field; cancellation warns for any meaningful edit.
- All core mobile controls have visible Vietnamese text and at least 44×44 targets.
- Focus/list rows and view tabs work by keyboard with correct name/role/value and focus behavior.
- Address labels/search work with valid current API shapes.
- Address refresh handles same-count graph changes and stale requests safely.
- At 320/375/430px and 200% text, required content and controls remain usable without overlap or clipping.
- Capability visibility remains correct for Owner, Contributor, Linked and Reader.
- No automatic forced tour or graph-covering guidance remains.
- Telemetry is enum-only and covers Help, recovery, find-person and viewpoint change.
- Production and prototype mirrors remain synchronized.
- No API, database, privacy or kinship regression.

## Required verification

Run from `frontend/`:

```bash
npm run typecheck
npm test -- --run
npm run lint
npm run build
npx playwright test tests/e2e/prototype.spec.ts tests/e2e/prototype-audit.spec.ts tests/e2e/senior-ux-baseline.audit.spec.ts --project=chromium
```

Run from repository root:

```bash
git diff --check
```

Inspect fresh screenshots at 320, 375 and 430px, including 200% text. If a command cannot run, mark it unverified. Do not weaken assertions merely to produce green output.

## Required handoff

End with a section titled `REVIEW PROMPT FOR CODEX` containing:

1. Original objective and exact assigned scope.
2. Every changed path and a concise description.
3. Important implementation decisions and rationale.
4. Acceptance criteria status: pass, fail, partial or not verified, with evidence.
5. Exact verification commands, exit status and material output.
6. Anything unverified or blocked.
7. Remaining risks and assumptions.
8. Focused requests for Codex review.

Codex will inspect the actual diff and rerun all checks independently. Do not claim completion based only on unit tests or prose inspection.
