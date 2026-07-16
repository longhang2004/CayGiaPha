# Progressive Workspace Coach Marks Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add progressive, capability-aware Coach mark chapters that cover the populated workspace, action drawer, graph controls, and person detail without overwhelming older or low-confidence users.

**Architecture:** Codex freezes and integrates the shared guidance contract. Small sequential Gemini Flash packets implement schema migration, canonical Help, reusable Coach mark behavior, and one surface integration at a time. Production and prototype reuse the same components; no API, database, privacy, capability, or graph-engine change is allowed.

**Tech Stack:** Next.js 14, React 18, TypeScript, Vitest, Testing Library, Playwright, existing CGP primitives and semantic SCSS tokens.

## Global Constraints

- Use the approved progressive model: one overview tour and contextual `actions`, `graph`, and `person` mini-tours.
- Overview has at most 5 available steps; each contextual chapter has at most 3 available steps.
- A chapter auto-starts only the first time its user-opened surface becomes available.
- Never auto-open a drawer, change view mode, select a person, or trigger a product action.
- Resolve Coach copy only from canonical `HELP_TOPICS`; do not duplicate guidance prose in UI components.
- Filter steps by existing DOM anchors and server-projected capabilities; role labels never grant authority.
- Keep Coach cards inside the active drawer/panel focus scope and preserve focus restoration, Escape, Back, Skip, Next, and Complete behavior.
- Preserve living-person privacy, redaction, graph semantics, REST APIs, and database schema.
- Use existing CGP primitives, semantic tokens, and standard `<img>`; add no dependency.
- Update `/prototype/tree` behavior/tests in the same change; never import prototype data into production code.
- Work in the existing feature branch and shared checkout; only one patch writer may run at once.
- Do not commit unless the user separately authorizes a commit.

## Routing Record

```text
Execution route: HYBRID_DELEGATION
Product gate: pass
Design gate: pass — progressive contextual direction approved by user
Self-implementation assessment: Heavy owns the schema/interface contract, integration review, capability/privacy checks, and final verification. Mechanical test-first packets are suitable for Gemini Flash.
Delegation candidates: P1 storage migration, P2 Help registry, P3 shared Coach sequence, P4 action drawer, P5 graph controls, P6 person panel, P7 prototype/E2E/docs synchronization.
Mandatory delegation gates: all packets are bounded, contract-stable after P1/P3, exact-file-owned, targeted-test verifiable, recoverable, and shared-checkout sequential.
Net-benefit assessment: positive because each packet is narrow and mechanically verifiable while avoiding one broad worker with excessive context.
Final routing decision: HYBRID_DELEGATION with Gemini Flash sequential writers and Codex review after every packet.
```

## Dependency order

`P1 storage contract → P2 Help content → P3 reusable sequence → P4/P5/P6 surface integrations → P7 prototype/E2E/spec sync → Codex final review`.

P4, P5 and P6 are logically independent after P3 but must run sequentially because they share one checkout. P7 runs after all behavior is stable.

## Patch batches

| Packet | Owner/model | Scope | Depends on | Deliverable | Verification | Risk/mode |
|---|---|---|---|---|---|---|
| P1 | Gemini Flash | `storage.ts`, `guidance.test.ts` | none | schema 5, chapter migration/writer/replay event | targeted Vitest | shared-checkout sequential, medium |
| P2 | Gemini Flash | `helpTopics.ts`, `helpTopics.test.ts` | P1 contract names only | canonical topics/excerpts for all chapters | targeted Vitest | shared-checkout sequential, light |
| P3 | Gemini Flash | `CoachMarkSequence.tsx`, `ContextualCoachMarks.tsx`, `WorkspaceCoachMarks.tsx`, direct tests | P1, P2 | shared lifecycle and overview max-5 sequence | targeted Vitest | shared-checkout sequential, medium |
| P4 | Gemini Flash | `TreePageHeader.tsx`, `TreePageCapabilities.test.tsx`, affected SCSS region | P3 | action drawer mini-tour and anchors | targeted Vitest | shared-checkout sequential, medium |
| P5 | Gemini Flash | `TreeGraphControls.tsx`, `TreeGraph.test.tsx`, graph CSS region | P3 | graph-controls mini-tour and replay | targeted Vitest | shared-checkout sequential, medium |
| P6 | Gemini Flash | `TreePageSlidePanel.tsx`, `PersonInfoPanel.tsx`, `TreePageCapabilities.test.tsx` | P3 | capability-aware person mini-tour | targeted Vitest | shared-checkout sequential, medium |
| P7 | Gemini Flash | prototype/E2E fixtures, Kiro/UI docs | P1–P6 | schema fixtures and contract documentation synchronized | targeted Playwright collection + diff check | shared-checkout sequential, light |

## Task 1: Versioned chapter persistence (P1)

**Files:**
- Modify: `frontend/src/lib/guidance/guidance.test.ts`
- Modify: `frontend/src/lib/guidance/storage.ts`

**Interfaces:**
- Produce `WorkspaceCoachChapter = "overview" | "actions" | "graph" | "person"`.
- Produce schema-5 `WorkspaceCoachState` with `version: 2` and `chapters`.
- Change writer to `recordWorkspaceCoachStatus(chapter, status, storage)`.
- Produce typed `reopenGuidanceChapter(chapter)` helper while preserving generic-event overview compatibility.

- [ ] Write failing tests for schema-5 default, schema-4/legacy migration, invalid chapter/status redaction, independent chapter writes, and typed replay detail.
- [ ] Run `cd frontend && npm test -- src/lib/guidance/guidance.test.ts` and verify failures are caused by the missing schema-5 contract.
- [ ] Implement the allowlisted migration and writer without persisting identifiers or arbitrary keys.
- [ ] Re-run the targeted test and require all cases to pass.
- [ ] Return the required Review Prompt; Codex reviews the diff and independently reruns the same command.

## Task 2: Canonical Help content (P2)

**Files:**
- Modify: `frontend/src/content/help/helpTopics.test.ts`
- Modify: `frontend/src/content/help/helpTopics.ts`

**Interfaces:**
- Add active all-role topic `thao-tac-trong-cay` with contextual excerpt.
- Add capability-sensitive but role-valid topic `sua-va-them-thanh-vien` for owner/editor and linked-compatible viewing copy only where the topic is eligible.
- Add active all-role topic `xem-va-luu-so-do` with contextual excerpt.
- Add contextual excerpts to existing overview topics used by the five-step tour when missing.

- [ ] Write failing registry tests proving required topic IDs, roles, contextual excerpts, related IDs, lowercase keywords, and review metadata.
- [ ] Run `cd frontend && npm test -- src/content/help/helpTopics.test.ts` and verify expected missing-topic failures.
- [ ] Add the smallest complete canonical topic content; do not copy it into Coach components.
- [ ] Re-run the targeted test and require all cases to pass.
- [ ] Return the required Review Prompt; Codex inspects accuracy and reruns the test.

## Task 3: Reusable Coach sequence and overview (P3)

**Execution split:** Run P3A first for the reusable hook/card and inline wrapper, then P3B for the graph-overlay overview integration. These are separate sequential review gates so no worker owns both the shared lifecycle contract and all workspace behavior at once.

**Files:**
- Create: `frontend/src/components/guidance/CoachMarkSequence.tsx`
- Create: `frontend/src/components/guidance/ContextualCoachMarks.tsx`
- Modify: `frontend/src/components/guidance/WorkspaceCoachMarks.tsx`
- Modify: `frontend/src/components/guidance/WorkspaceCoachMarks.test.tsx`
- Create: `frontend/src/components/guidance/CoachMarkSequence.test.tsx`

**Interfaces:**
- `CoachStep` accepts `topicId`, ordered `anchorIds`, and preferred placement.
- `CoachMarkSequence` owns chapter status, available-step resolution, Back/Next/Skip/Escape, highlight and focus restoration.
- `ContextualCoachMarks` renders the same sequence inline when its surface `enabled` state is true.
- `WorkspaceCoachMarks` remains the graph-overlay wrapper for chapter `overview` and keeps `initialTopicId`/`anchorOverride` prototype support.

- [ ] Write failing tests for a five-step overview, Back, missing/inert anchors, per-role topic filtering, per-chapter persistence, manual replay matching only the requested chapter, and focus restoration.
- [ ] Run `cd frontend && npm test -- src/components/guidance/WorkspaceCoachMarks.test.tsx` and verify failures occur because shared sequence behavior is missing.
- [ ] Implement reusable lifecycle logic and overview wrapper; do not auto-open or operate product controls.
- [ ] Re-run the targeted tests and require them to pass without warnings.
- [ ] Return the required Review Prompt; Codex checks focus, safe-area and storage integration and reruns tests.

## Task 4: Action drawer contextual chapter (P4)

**Files:**
- Modify: `frontend/src/components/tree-page/TreePageHeader.tsx`
- Modify: `frontend/src/components/tree-page/TreePageCapabilities.test.tsx`
- Modify only the action-drawer/Coach region of `frontend/src/styles/_03_tree_workspace.scss`

**Interfaces:**
- Chapter is `actions` and is enabled only while the action drawer is open.
- Step anchors represent: search/viewpoint; edit/add; manage/help. Missing capability groups are skipped.
- “Mở hướng dẫn nhanh” replays the `actions` chapter without closing the drawer.

- [ ] Add failing Owner/Contributor/Linked/Reader tests for auto-start once, missing capability steps and manual action-chapter replay.
- [ ] Run `cd frontend && npm test -- src/components/tree-page/TreePageCapabilities.test.tsx` and verify expected failures.
- [ ] Add data anchors, inline contextual sequence and minimal responsive styles within the drawer focus scope.
- [ ] Re-run the targeted test and `git diff --check`.
- [ ] Return the required Review Prompt; Codex reviews capability visibility and focus-trap containment.

## Task 5: Graph-controls contextual chapter (P5)

**Files:**
- Modify: `frontend/src/components/graph/TreeGraphControls.tsx`
- Modify: `frontend/src/components/graph/TreeGraph.test.tsx`
- Modify only the controls/Coach region of `frontend/src/components/graph/graph.css`

**Interfaces:**
- Chapter is `graph` and is enabled only after `isExpanded` is true.
- Three representative anchors cover zoom, center/reset, and fullscreen/export/legend/help groups.
- The existing Help link remains available; a labelled quick-guide action replays the graph chapter without navigation.

- [ ] Add failing tests proving no auto-tour before expand, one-time auto-start after expand, group navigation and manual replay.
- [ ] Run the focused `TreeGraph.test.tsx` cases and verify expected missing-feature failures.
- [ ] Add group anchors and contextual sequence without changing graph callbacks or gesture equivalents.
- [ ] Re-run `cd frontend && npm test -- src/components/graph/TreeGraph.test.tsx` and `git diff --check`.
- [ ] Return the required Review Prompt; Codex verifies graph callbacks and accessibility remain intact.

## Task 6: Person-detail contextual chapter (P6)

**Files:**
- Modify: `frontend/src/components/tree-page/TreePageSlidePanel.tsx`
- Modify: `frontend/src/components/graph/PersonInfoPanel.tsx`
- Modify: `frontend/src/components/tree-page/TreePageCapabilities.test.tsx`

**Interfaces:**
- Chapter is `person`, enabled only for selected-person view mode, never create/edit/add-relative forms.
- Anchors cover info/address, capability-visible edit/add/viewpoint actions, and claim/photos when present.
- Missing capability anchors are skipped, and the card remains inside the side/bottom panel.

- [ ] Add failing role tests for Owner, Linked and Reader, including absence during edit/add-relative modes.
- [ ] Run `cd frontend && npm test -- src/components/tree-page/TreePageCapabilities.test.tsx` and verify expected failures.
- [ ] Add the inline chapter and semantic anchors without changing capability decisions or destructive-action behavior.
- [ ] Re-run the targeted test and `git diff --check`.
- [ ] Return the required Review Prompt; Codex checks privacy/capability and panel focus containment.

## Task 7: Prototype, E2E, specs and UI documentation (P7)

**Files:**
- Modify: `frontend/tests/e2e/prototype.spec.ts`
- Modify: `frontend/tests/e2e/prototype-audit.spec.ts`
- Modify: `.kiro/specs/vietnamese-family-tree/design.md`
- Modify: `.kiro/specs/vietnamese-family-tree/tasks.md`
- Modify: `frontend/docs/ui/README.md`

**Interfaces:**
- All seeded guidance state uses schema 5 and chapter version 2.
- Prototype tests prove overview plus one contextual chapter; production and prototype continue sharing components.
- Docs describe progressive chapters and migration, not the retired single-status contract.

- [ ] Update seeded storage fixtures and add focused Playwright assertions for one-time contextual behavior and replay.
- [ ] Update Kiro/UI documentation with the exact schema and chapter lifecycle.
- [ ] Run `cd frontend && npx playwright test --list tests/e2e/prototype.spec.ts tests/e2e/prototype-audit.spec.ts` and `git diff --check`.
- [ ] Return the required Review Prompt; Codex reviews all fixtures and documentation claims.

## Integration and final verification

Codex reviews each packet before starting the next writer. If a worker changes a shared contract outside its packet, the batch stops and Codex either issues one corrective prompt or absorbs the packet. No worker claim is accepted without inspecting the actual diff and rerunning its targeted check.

After P7:

```bash
cd frontend
npm test -- src/lib/guidance/guidance.test.ts src/content/help/helpTopics.test.ts src/components/guidance/WorkspaceCoachMarks.test.tsx src/components/tree-page/TreePageCapabilities.test.tsx src/components/graph/TreeGraph.test.tsx
npm run typecheck
npm run lint
npm run build
npx playwright test tests/e2e/prototype.spec.ts
npx playwright test tests/e2e/prototype-audit.spec.ts
```

Codex then inspects mobile 375×667, tablet 768×1024 and desktop 1280×800 states using the user's chosen browser if visual browser verification is required. Final state is COMMIT-READY; no automatic commit.

## Fallback

- One incomplete or incompatible Gemini patch receives one bounded corrective prompt.
- If the same packet still fails, Codex absorbs that packet instead of sending repeated broad prompts.
- Any privacy, capability, focus-trap or migration ambiguity immediately returns ownership to Codex/Heavy.
