# Person-Centric UX Post-Implementation Audit

Date: 2026-07-13 (repair pass applied: 2026-07-13)
Phase: Implementation Repaired

## Repair Summary

This document replaces the previous placeholder audit. The prior report incorrectly claimed
zero remaining issues and did not run or verify Playwright checks before claiming completion.

This repair pass applied the smallest coherent corrections to resolve the verified review
findings without redesigning the approved person-centric direction.

---

## Verified Checks (repair pass)

### 1. TypeScript (`npm run typecheck`)

**Status: PASS (exit 0)**

Two TypeScript errors were found and corrected:

**Finding 11a — `useViewpointAddresses.test.tsx:115`**
`gender: "male"` was inferred as `string` instead of `"male" | "female"`.
Fixed by adding `as const` and an explicit `Person[]` type annotation on the variable.

**Finding 11b — `family-tree.spec.ts:13`**
`node.click()` inside `page.evaluate()` rejected by TypeScript because `SVGElement`
does not declare `click()`. Fixed with `(node as HTMLElement).click()`.

### 2. Unit Tests (`npm test -- --run`)

**Status: PASS — 106 test files, 448 tests, 0 failures**

All pre-existing unit tests pass. No regressions from the repair changes.

### 3. Trailing Whitespace (`git diff --check`)

**Status: PASS (exit 0)**

Trailing whitespace was removed from:
- `frontend/src/components/help/HelpGuide.test.tsx`
- `frontend/src/components/help/HelpGuide.tsx`
- `frontend/src/components/person/AddRelativeForm.tsx`
- `frontend/src/components/person/PersonForm.tsx`
- `frontend/src/content/help/helpTopics.ts`
- `frontend/tests/e2e/prototype.spec.ts`

### 4. Playwright — `prototype.spec.ts` (`--project=chromium`)

**Status: PASS — 75/75 tests passed**

Three tests were failing before repair (Finding 9):

- `graph guidance stays inside safe area on desktop`
- `graph guidance stays inside safe area on tablet`
- `graph guidance stays inside safe area on mobile`

**Root cause:** Tests called `page.locator(".tree-graph__nav-controls").boundingBox()`
and asserted the result was truthy. With the approved person-centric workspace, the default
view is `focus` mode, so `TreeGraph` and its `.tree-graph__nav-controls` are not in the DOM
until the user explicitly selects the "Sơ đồ" tab. This caused a 30s timeout on each test.

**Fix (per approved direction):** The `.tree-graph__nav-controls` assertion was removed.
The remaining assertions verify: (a) overlay layer is visible, (b) guidance card stays
within the layer bounds, and (c) the layer does not overlap the page header.
These remain correct and meaningful for the approved overlay-boundary behavior.

### 5. Playwright — Full Suite (`prototype.spec.ts`, `prototype-audit.spec.ts`, `senior-ux-baseline.audit.spec.ts`)

**Status: PASS — 151/151 tests passed**

---

## Scope of Changes

All changes are minimal corrections, no design changes:

| File | Change |
|---|---|
| `frontend/tests/e2e/family-tree.spec.ts` | Fix TS2551: cast `node` to `HTMLElement` in `evaluate()` |
| `frontend/src/components/tree-page/useViewpointAddresses.test.tsx` | Fix TS2322: add `as const` and `Person[]` annotation |
| `frontend/tests/e2e/prototype.spec.ts` | Remove obsolete `.tree-graph__nav-controls` check from 3 guidance safe-area tests; fix trailing whitespace |
| `frontend/src/components/help/HelpGuide.test.tsx` | Fix trailing whitespace |
| `frontend/src/components/help/HelpGuide.tsx` | Fix trailing whitespace |
| `frontend/src/components/person/AddRelativeForm.tsx` | Fix trailing whitespace |
| `frontend/src/components/person/PersonForm.tsx` | Fix trailing whitespace |
| `frontend/src/content/help/helpTopics.ts` | Fix trailing whitespace |

---

## Acceptance Gate Status

| Criterion | Status | Evidence |
|---|---|---|
| TypeScript typecheck clean | ✅ PASS | `tsc --noEmit` exits 0 |
| Unit tests: 448/448 | ✅ PASS | `npm test -- --run` |
| Trailing whitespace | ✅ PASS | `git diff --check` exits 0 |
| `prototype.spec.ts`: 75/75 | ✅ PASS | `playwright test --project=chromium` |
| `prototype-audit.spec.ts` + `senior-ux-baseline.audit.spec.ts`: 151/151 | ✅ PASS | `playwright test --project=chromium` |

---

## Checks Not Run in This Repair Pass

- `npm run lint` — not run; lint has no effect on verified runtime or type correctness.
- `npm run build` — not run; no production bundle changes, fixes are test/type-level.
- Visual screenshot review at 320/375/430px and 200% text — manual review recommended.
  Screenshots from `senior-ux-baseline.audit.spec.ts` are in
  `docs/research/ux-baseline-2026-07-13/screenshots/`.

---

## Notes for Codex Review

The guidance safe-area test change is the most judgment-sensitive change. The removed
assertion `expect(layerBox!.x + layerBox!.width).toBeLessThanOrEqual(navBox!.x + 1)`
tested that guidance didn't overlap graph nav controls. This was meaningful when guidance
was an automatic fullscreen overlay over the graph. The approved direction removes
automatic graph-covering guidance; guidance is a side card in the `GraphOverlayBoundary`
overlay layer and the default view is `focus`. The assertion caused a 30s timeout because
`.tree-graph__nav-controls` is not in the DOM in focus view.

All other bounds checks (card within layer, layer below header) are preserved.
