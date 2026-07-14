# Person-Centric Mobile UX Implementation Plan

> **For agentic workers:** Execute this plan sequentially. Do not dispatch parallel workers because tree context, workspace composition, shared SCSS, capability UI, and prototype mirrors overlap.

**Goal:** Make the default mobile experience understandable and operable for older adults and low-confidence technology users by shipping the approved person-centric direction, while retaining list and graph alternatives.

**Architecture:** Move viewpoint-address loading above the graph so `focus`, `list`, and `graph` consume one controlled state. Compose the three modes in a shared component reused by production and prototype, persist `focus` as the safe default, keep server capabilities authoritative, and keep Help content canonical in `HELP_TOPICS`. Add a typed, allow-listed Vercel Analytics wrapper.

**Tech Stack:** Next.js 14 App Router, React 18, TypeScript 5.5, SCSS, Vitest/Testing Library, Playwright, axe-core, `@vercel/analytics` 2.x.

## Global Constraints

- The user explicitly waived moderated usability rounds on 2026-07-13 and approved option 1, person-centric. This is a heuristic/accessibility-led decision, not a validated usability result.
- Visual reference: `/Users/longhang/.codex/generated_images/019f5b51-72cc-7f12-98b3-1f7765698b74/exec-8917a52e-46ca-4834-92d5-bf41ae28d9f0.png`.
- Preserve the warm editorial identity, semantic tokens, Plus Jakarta Sans, and `components/cgp`. Do not create a second design system or refactor unrelated CSS.
- Do not change REST endpoints, database schema, kinship algorithms, living-person redaction, privacy projection, or capability semantics.
- Owner, Contributor, Linked, and Reader actions come only from server-provided tree/person capabilities.
- Core actions require visible Vietnamese labels. Gestures, pan, pinch, wheel, drag, hover, and icon recognition are shortcuts only.
- Every target is at least 44×44 CSS px, preferably 48×48; retain visible focus and name/role/value.
- Reflow at 200% text without clipping, covered navigation, fixed-height document traps, or horizontal page overflow at 320, 375, and 430 px.
- Use HTML `<img>`, never `next/image`.
- `HELP_TOPICS` remains the sole content source. Components select by topic ID/excerpt; they do not duplicate prose.
- Do not add true Undo without a safe inverse API, and do not show fake Undo.
- Analytics never sends IDs, names, codes, search terms, contact data, images, tokens, free text, or family data.
- Update `/prototype/tree-list`, `/prototype/tree`, `/prototype/tree/empty`, and `/prototype/help` in the same task as their production UI.
- Preserve pre-existing dirty files. Do not stage, commit, push, reset, clean, or delete files without separate authorization.

## RTK Contract

```text
Role: frontend
Task: implement the approved person-centric mobile UX across tree list/empty, workspace, Help, recovery, telemetry, and prototype mirrors
Knowledge: AGENTS.md; Kiro requirements 3–10 and 13–18; frontend/docs/ui; older-adult brief; baseline audit; selected option 1 image
Success: focus/list/graph work with focus default; labelled non-gesture actions; capability-safe UI; searchable canonical Help; retained fields; redacted telemetry; synchronized prototypes; checks pass
Constraints: smallest correct change; no API/database/privacy changes; existing design language; HTML img only; no commit
```

## Routing Record

```text
Execution route: HYBRID_DELEGATION
Product gate: pass
Design gate: design already approved — option 1 person-centric
Self-implementation assessment: cross-cutting work, but the user requested Gemini implementation to conserve Codex quota; one sequential worker avoids ownership conflicts.
Delegation candidates: Tasks 1–7 as one ordered Gemini workstream
Mandatory delegation gates: pass — frozen contracts below, single-worker ownership, targeted verification, recoverable through diff review
Net-benefit assessment: positive — prompt/review cost is lower than direct implementation and there is no multi-worker integration cost
Final routing decision: Gemini implements sequentially; Codex reviews the actual diff and independently verifies before any commit-ready claim
```

## Non-goals

- No deep redesign of auth, invitation/claim, settings, support, legal, feedback, or admin.
- No “senior mode”, new backend search API, server-side drafts, schema migration, optimistic relationship mutation, simulated Undo, new dependency, or visual-identity replacement.

## Dependency Order

1. Freeze storage, telemetry, Help metadata, and address-loading contracts.
2. Make viewpoint addresses independent of graph rendering.
3. Build focus/list/graph and labelled shell.
4. Simplify tree-list/empty guidance.
5. Reformat Help for task lookup.
6. Add review/recovery without mutation-contract changes.
7. Synchronize specs and run integrated verification.

---

### Task 1: Typed View-Mode, Telemetry, and Help Contracts

**Files:**

- Create: `frontend/src/lib/tree-workspace/viewMode.ts`
- Create: `frontend/src/lib/tree-workspace/viewMode.test.ts`
- Create: `frontend/src/lib/analytics/uxEvents.ts`
- Create: `frontend/src/lib/analytics/uxEvents.test.ts`
- Modify: `frontend/src/content/help/helpTopics.ts`
- Modify: `frontend/src/content/help/helpTopics.test.ts`

**Required interfaces:**

```ts
export type TreeWorkspaceViewMode = "focus" | "list" | "graph";
export const TREE_WORKSPACE_VIEW_MODE_KEY = "cgp_tree_workspace_view_v1";
export function readTreeWorkspaceViewMode(storage?: Pick<Storage, "getItem">, fallback?: TreeWorkspaceViewMode): TreeWorkspaceViewMode;
export function writeTreeWorkspaceViewMode(mode: TreeWorkspaceViewMode, storage?: Pick<Storage, "setItem">): void;

export type HelpTopicCategory = "bat-dau" | "nguoi-va-quan-he" | "tim-va-xung-ho" | "quyen-va-rieng-tu" | "tuy-chinh-va-ho-tro";

export type UxEventName = "ux_core_flow_start" | "ux_core_flow_complete" | "ux_core_flow_error" | "ux_help_open" | "ux_recovery_used";
export interface UxEventPayload {
  flow: "create_tree" | "join_tree" | "add_first_person" | "add_relative" | "find_person" | "change_viewpoint" | "edit_person";
  surface: "tree_list" | "tree_empty" | "workspace_focus" | "workspace_list" | "workspace_graph" | "help" | "person_form" | "relative_form";
  viewportClass: "mobile" | "tablet" | "desktop";
  accessRole: "owner" | "contributor" | "linked" | "reader" | "unknown";
  outcome: "started" | "completed" | "validation_error" | "request_error" | "cancelled" | "retry";
}
export function getUxViewportClass(width?: number): UxEventPayload["viewportClass"];
export function trackUxEvent(name: UxEventName, payload: UxEventPayload): void;
```

`trackUxEvent` constructs a new object containing exactly the five allowed fields before calling `track` from `@vercel/analytics/react`. It does not accept an arbitrary property bag. Analytics failure is non-fatal and must not log the payload.

Add required `category` and `keywords: string[]` fields to `HelpTopic`. Categorize all 14 active topics without changing IDs, aliases, roles, or canonical task content.

- [ ] Write failing tests for focus default, valid persistence, invalid/legacy fallback, missing storage, and storage exceptions.
- [ ] Mock Vercel `track`; assert exact allow-listed payload, viewport boundaries at 430/900 px, and swallowed tracking failure.
- [ ] Extend topic tests so every active topic has a valid category and normalized keywords while existing coverage remains true.
- [ ] Implement and run:

```bash
cd frontend
npm test -- src/lib/tree-workspace/viewMode.test.ts src/lib/analytics/uxEvents.test.ts src/content/help/helpTopics.test.ts
```

Expected: all selected tests pass.

### Task 2: Controlled Viewpoint Addresses

**Files:**

- Create: `frontend/src/components/tree-page/useViewpointAddresses.ts`
- Create: `frontend/src/components/tree-page/useViewpointAddresses.test.tsx`
- Modify: `frontend/src/components/tree-page/useTreePageState.ts`
- Modify: `frontend/src/components/tree-page/TreeContext.tsx`
- Modify: `frontend/src/components/graph/TreeGraph.tsx`
- Modify: `frontend/src/components/graph/TreeGraph.test.tsx`
- Modify: `frontend/src/components/tree-page/TreePageCapabilities.test.tsx`
- Modify: `frontend/src/app/(prototype)/prototype/tree/page.tsx`

**Required interface:**

```ts
export interface UseViewpointAddressesInput {
  treeId: string;
  egoId: string;
  persons: Person[];
  relationships: Relationship[];
  refreshKey: number;
  fetchAddresses?: typeof fetchViewpointAddresses;
}
export interface UseViewpointAddressesResult {
  addresses: Map<string, Address>;
  loading: boolean;
  ready: boolean;
  error: string | null;
}
export function useViewpointAddresses(input: UseViewpointAddressesInput): UseViewpointAddressesResult;
```

The hook aborts stale requests, ignores out-of-order results, clears readiness when viewpoint/tree structure changes, retains viewpoint on failure, and exposes the current Vietnamese error. `useTreePageState` owns addresses. Add controlled `addresses`, `addressLoading`, and `addressError` props to `TreeGraph`; keep fallback fetching only for isolated compatibility, and prevent duplicate production requests. Initial loading overlay covers only session/tree loading; address recomputation uses inline status.

Add `addressError: string | null` to `TreeContextType`. Derive `selectedAddress` from the controlled address map plus `selectedId`, and derive `selectedEgo` from `persons` plus `egoId`, so focus/list never depend on mounting the graph.

- [ ] Test initial load, viewpoint change, stale result, abort, unresolved data, and failure.
- [ ] Test that controlled graph addresses render without calling the fallback fetcher.
- [ ] Implement production and prototype paths together; prototype injects `mockFetchAddresses` and remains API-isolated.
- [ ] Run:

```bash
cd frontend
npm test -- src/components/tree-page/useViewpointAddresses.test.tsx src/components/graph/TreeGraph.test.tsx src/components/tree-page/TreePageCapabilities.test.tsx
```

Expected: one address request per viewpoint change.

### Task 3: Person-Centric Workspace Modes and Labelled Shell

**Files:**

- Create: `frontend/src/lib/tree-workspace/people.ts`
- Create: `frontend/src/lib/tree-workspace/people.test.ts`
- Create: `frontend/src/components/tree-page/TreeWorkspaceViewSwitcher.tsx`
- Create: `frontend/src/components/tree-page/TreeWorkspaceViewSwitcher.test.tsx`
- Create: `frontend/src/components/tree-page/TreeFocusView.tsx`
- Create: `frontend/src/components/tree-page/TreePeopleListView.tsx`
- Create: `frontend/src/components/tree-page/TreeWorkspaceSurface.tsx`
- Create: `frontend/src/components/tree-page/TreeWorkspaceSurface.test.tsx`
- Modify: `frontend/src/app/tree/[id]/page.tsx`
- Modify: `frontend/src/components/tree-page/TreePageHeader.tsx`
- Modify: `frontend/src/components/tree-page/TreePageSlidePanel.tsx`
- Modify: `frontend/src/components/graph/TreeGraphControls.tsx`
- Modify: `frontend/src/components/AppLayoutWrapper.tsx`
- Modify: `frontend/src/components/AppLayoutWrapper.test.tsx`
- Modify: `frontend/src/components/help/HelpEntryPoint.tsx`
- Modify: `frontend/src/components/help/HelpEntryPoint.test.tsx`
- Modify: `frontend/src/styles/_03_tree_workspace.scss`
- Modify: `frontend/src/styles/_07_sidebar_mobile.scss`
- Modify: `frontend/src/components/graph/graph.css`
- Modify: `frontend/src/app/(prototype)/prototype/tree/page.tsx`
- Modify: `frontend/tests/e2e/prototype.spec.ts`

**Pure interfaces:**

```ts
export type FocusRelationKind = "father" | "mother" | "spouse" | "child" | "asserted" | "social";
export interface FocusRelation { relationshipId: string; person: Person; kind: FocusRelationKind; label: string; address?: Address; }
export function getFocusRelations(focusPersonId: string, persons: Person[], relationships: Relationship[], addresses: Map<string, Address>): FocusRelation[];
export function filterWorkspacePeople(persons: Person[], addresses: Map<string, Address>, query: string): Person[];
```

Use `normalizeName`. Bloodline source is parent and target is child; marriage is symmetric. UI labels are `Cha`, `Mẹ`, `Vợ/chồng`, `Con`, stored asserted label, or `Quan hệ xã hội`. Never derive new kinship terms client-side.

**Interaction contract:**

- `focus` shows selected person, or viewpoint person when none is selected, plus immediate relations and computed address text.
- Visible tabs are `Một người`, `Danh sách`, `Sơ đồ`, with tab semantics, arrow keys, and persisted choice.
- Every mode shows `Đang xem từ [Tên]` and `Đổi người làm góc nhìn`.
- List selection changes to focus and keeps the person selected; relation-card selection focuses that relative. Graph selection may open details.
- `Sửa thông tin` and `Thêm người thân` appear only for selected-person capabilities.
- Graph keeps gestures but visibly labels zoom in/out, center selected, reset region, legend, Help, and permitted add-person actions. Export/fullscreen may remain secondary with accessible names.
- `TreePageSlidePanel` does not duplicate focus/list overview; it remains for edit/add forms and graph detail.
- `TreePageHeader({ treeListHref = "/tree", helpHref = "/help" })` keeps backwards-compatible defaults; the prototype passes `/prototype/tree-list` and `/prototype/help`.
- `HelpEntryPoint` accepts optional `href`, default `/help`.
- Mobile top bar gets a visible tree-list/home label and keeps prototype navigation inside prototype routes.
- The only Help/tree-list/add-person path is never drawer-only.

- [ ] Test relationship direction, missing nodes, marriage, asserted/social labels, addresses, Vietnamese search, and empty query.
- [ ] Test tabs, invalid preference fallback, list-to-focus, labelled controls, and four-role visibility.
- [ ] Implement shared `TreeWorkspaceSurface`; keep mock adapters outside production.
- [ ] Replace touched inline styles with scoped classes.
- [ ] Instrument find-person, viewpoint-change, and Help-open with the typed wrapper.
- [ ] Run:

```bash
cd frontend
npm test -- src/lib/tree-workspace/people.test.ts src/components/tree-page/TreeWorkspaceViewSwitcher.test.tsx src/components/tree-page/TreeWorkspaceSurface.test.tsx src/components/tree-page/TreePageCapabilities.test.tsx src/components/AppLayoutWrapper.test.tsx src/components/help/HelpEntryPoint.test.tsx
```

Expected: all modes and four roles pass; prototype tests make no production API call.

### Task 4: Tree List, Empty Tree, and Inline Guidance

**Files:**

- Modify: `frontend/src/app/tree/page.tsx`
- Modify: `frontend/src/components/tree/TreeEntryModal.tsx`
- Modify: `frontend/src/components/tree/TreeEntryModal.test.tsx`
- Modify: `frontend/src/components/guidance/GuidanceChecklist.tsx`
- Modify: `frontend/src/components/guidance/GuidanceChecklist.test.tsx`
- Modify: `frontend/src/components/guidance/GuidanceOrchestrator.tsx`
- Modify: `frontend/src/lib/guidance/guidance.test.ts`
- Modify: `frontend/src/styles/_02_typography.scss`
- Modify: `frontend/src/styles/_03_tree_workspace.scss`
- Modify: `frontend/src/styles/_08_modals_auth.scss`
- Modify: `frontend/src/app/(prototype)/prototype/tree-list/page.tsx`
- Modify: `frontend/src/app/(prototype)/prototype/tree/empty/page.tsx`
- Modify: `frontend/tests/e2e/prototype.spec.ts`

Keep checklist IDs/meaning unchanged, so schema remains 3. If an ID or completion meaning changes, bump to 4 and add v2/v3 migration tests; presentation-only changes do not justify churn.

- Tree list shows 3–5 inline steps only when empty. Existing-tree users see title, visible `Thêm cây`, and cards first.
- Empty tree has one concise heading, one compact checklist, then first-person form in normal flow; remove duplicate contextual overlay.
- No automatic graph-covering tour. Guidance is dismissible and reopenable with a labelled control.
- Create/join stays one decision per step. Back retains name/region/code; errors stay adjacent and keep valid values.
- Reader/Linked empty state has no unauthorized create action.
- Track create/join/first-person start, complete, and error.

- [ ] Test inline placement, reopen, retained modal fields, errors, and capability-safe empty state.
- [ ] Update production and both prototype mirrors together.
- [ ] Remove fixed-height/overflow rules that break 200% vertical scrolling.
- [ ] Run:

```bash
cd frontend
npm test -- src/components/tree/TreeEntryModal.test.tsx src/components/guidance/GuidanceChecklist.test.tsx src/lib/guidance/guidance.test.ts
npx playwright test tests/e2e/prototype.spec.ts --project=chromium
```

Expected: targeted checks pass.

### Task 5: Searchable Task-Oriented Help Hub

**Files:**

- Modify: `frontend/src/components/help/HelpGuide.tsx`
- Modify: `frontend/src/components/help/HelpGuide.test.tsx`
- Modify: `frontend/src/components/help/HelpNav.tsx`
- Modify: `frontend/src/components/help/HelpSection.tsx`
- Modify: `frontend/src/content/help/helpTopics.ts`
- Modify: `frontend/src/styles/_02_typography.scss`
- Modify: `frontend/src/styles/_05_header.scss`
- Verify: `frontend/src/app/(prototype)/prototype/help/page.tsx`
- Modify: `frontend/tests/e2e/prototype.spec.ts`

- Add labelled search and category buttons. Search title/summary/keywords with `normalizeName`; never track the query.
- Show one selected topic at a time. All active topics remain reachable; hash aliases canonicalize and focus the heading.
- Show visible/programmatic current category/topic. No-result state has `Xóa tìm kiếm`.
- `HelpGuide({ returnHref = "/tree" })` uses safe same-origin history and the supplied fallback; prototype passes `/prototype/tree-list`.
- No component duplicates topic prose. All Help actions meet 44×44.

- [ ] Test category coverage, normalized search, one-topic rendering, no-result recovery, hash/alias focus, keyboard focus, and Requirement 17 reachability.
- [ ] Implement and remove the render-all long document.
- [ ] Track Help open with enum fields only.
- [ ] Run:

```bash
cd frontend
npm test -- src/content/help/helpTopics.test.ts src/components/help/HelpGuide.test.tsx src/components/help/HelpEntryPoint.test.tsx
npx playwright test tests/e2e/prototype.spec.ts --project=chromium
```

Expected: 14 active topics remain reachable and only selected content is expanded.

### Task 6: Review and Safe Recovery

**Files:**

- Modify: `frontend/src/components/person/PersonForm.tsx`
- Modify: `frontend/src/components/person/PersonForm.test.tsx`
- Modify: `frontend/src/components/person/AddRelativeForm.tsx`
- Modify: `frontend/src/components/person/AddRelativeForm.test.tsx`
- Modify: `frontend/src/components/tree-page/TreePageSlidePanel.tsx`
- Modify: `frontend/src/components/tree-page/TreePageCapabilities.test.tsx`
- Modify: `frontend/src/styles/_04_forms_buttons.scss`
- Modify: `frontend/src/styles/_03_tree_workspace.scss`
- Verify: populated and empty tree prototype mirrors.

- Edit-person and add-relative submit first opens concise review naming affected people, relationship, and consequence. Mutation runs only after `Xác nhận lưu`.
- `Quay lại chỉnh sửa` and in-flow Cancel retain every field. Explicitly abandoning a dirty form requires named discard confirmation.
- API/field errors return to form, preserve valid fields, focus the first error/persistent alert, and remain until changed, resubmitted, or dismissed.
- Do not replace important errors with disappearing toast. Keep destructive deletion confirmation; add no Undo.
- Relationship labels are `Cha`, `Mẹ`, `Vợ/chồng`, `Con`, `Quan hệ khác`; technical edge/state terms remain internal.
- Track edit/add-relative start, complete, error, retry, and cancel with enum payloads.

- [ ] Test multi-field draft across review/back, field error, and request error.
- [ ] Prove mutation is not called before confirmation and called once afterward.
- [ ] Prove Linked/Reader cannot reach relationship review.
- [ ] Implement in React state only; add no persistence store.
- [ ] Run:

```bash
cd frontend
npm test -- src/components/person/PersonForm.test.tsx src/components/person/AddRelativeForm.test.tsx src/components/tree-page/TreePageCapabilities.test.tsx
```

Expected: drafts survive review/back/error and unauthorized actions are absent.

### Task 7: Specs, Integrated Verification, and Broad Audit

**Files:**

- Modify: `.kiro/specs/vietnamese-family-tree/requirements.md`
- Modify: `.kiro/specs/vietnamese-family-tree/design.md`
- Modify: `.kiro/specs/vietnamese-family-tree/tasks.md`
- Modify: `frontend/tests/e2e/prototype.spec.ts`
- Modify: `frontend/tests/e2e/prototype-audit.spec.ts`
- Modify: `frontend/tests/e2e/senior-ux-baseline.audit.spec.ts`
- Create: `docs/research/ux-baseline-2026-07-13/person-centric-post-implementation-audit.md`

Update Kiro with labelled core actions, non-gesture equivalents, persistent viewpoint context, persisted focus/list/graph, field retention, canonical contextual Help, and safe review/recovery. Mark the new implementation task complete only after integrated checks pass.

Extend Playwright for four roles and three modes. Assert no horizontal page overflow, covered navigation, visible core target below 44×44, or unreachable content at 200% for 320×568, 375×667, 430×932, 768×1024, and 1280×800. Check dark/system themes, reduced motion, keyboard focus restoration, and Help hashes.

- [ ] Run:

```bash
cd frontend
npm run typecheck
npm test
npm run lint
npm run build
npx playwright test tests/e2e/prototype.spec.ts tests/e2e/prototype-audit.spec.ts tests/e2e/senior-ux-baseline.audit.spec.ts --project=chromium
```

- [ ] Inspect captures visually and record route, viewport, state, severity, and evidence in the audit file. Do not start an unplanned second redesign; report remaining failures.
- [ ] Run:

```bash
git diff --check
git status --short
```

Expected: no whitespace errors; only assigned and pre-existing dirty files appear.

## Integrated Acceptance Gate

- `focus` is default for new/invalid state; valid `list`/`graph` persists per browser.
- Three modes use loaded people/addresses without a new API or duplicate viewpoint request.
- Users can find a person, understand `Đang xem từ [Tên]`, change viewpoint, center/zoom/reset, open legend/Help, and add a permitted person without gestures.
- Four roles never see actions beyond server capabilities.
- Create/join, first person, add relative, and edit retain valid fields across back/review/error.
- Help is canonical, searchable, categorized, hash-addressable, and covers Requirement 17.
- Telemetry is enum-only and contains no private/family data.
- No target below 44×44, covered navigation, horizontal overflow, or lost function at 200% in the matrix.
- Production/prototype are synchronized; prototypes call no real API.
- No API, database, privacy, capability, or kinship contract changed.

## Required Worker Handoff

```text
REVIEW PROMPT FOR CODEX

Original objective:
Implement the approved person-centric mobile UX plan without changing API, database, privacy, capability, or kinship contracts.

Assigned capability tier and scope:
Gemini single implementation worker; Tasks 1–7 in this plan.

Changed artifacts:
- <each path and concise purpose>

Implementation decisions:
- <decision and rationale>

Acceptance criteria status:
- [pass | fail | partial | not verified] <criterion and evidence>

Verification performed:
- Command/check: <exact command>
- Result: <exit code and material output>

Not verified or blocked:
- <claim not proven and reason>

Risks and assumptions:
- <remaining regression risk or assumption>

Review requests:
1. Inspect capability visibility and prototype isolation.
2. Inspect address-loading ownership for duplicate/stale requests.
3. Inspect analytics payload construction for private-data leakage.
4. Re-run unit, build, and Playwright checks.
5. Compare 320/375/430 renders with the selected reference.

Lead instructions:
Review the actual diff. Reject scope drift, unsupported completion claims, privacy/capability regressions, prototype drift, and inaccessible 200% behavior. Do not commit without authorization.
```
