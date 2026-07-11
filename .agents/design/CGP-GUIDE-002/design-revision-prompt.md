# DESIGN REVISION PROMPT — CGP-GUIDE-002

Role: UI/UX Designer

## Revision relationship

This is a focused corrective design task that depends on the approved and implemented
CGP-GUIDE-001 foundation. Preserve all already-approved foundations unless this prompt explicitly
supersedes an interaction rule.

Authoritative product revision:

`.kiro/specs/vietnamese-family-tree/product-tasks/CGP-GUIDE-002-guidance-semantics-safe-area.md`

Existing design baseline:

- `.agents/design/CGP-GUIDE-001/design-package.md`
- `.agents/design/CGP-GUIDE-001/po-ba-design-decision.md`
- `.agents/design/CGP-GUIDE-001/visual-01-tree-list-checklist.svg`
- `.agents/design/CGP-GUIDE-001/visual-02-workspace-context.svg`
- `.agents/design/CGP-GUIDE-001/visual-03-mobile-guidance.svg`
- `.agents/design/CGP-GUIDE-001/visual-04-help-topic.svg`

## Product problem

The implemented guidance foundation has interaction ambiguity and responsive placement debt:

- `Để sau` and `Ẩn hướng dẫn bắt đầu` are hard to distinguish.
- The completed checklist remains visible instead of retiring.
- Mobile/tablet CSS hides the workspace checklist completely.
- Viewport-based positioning and magic offsets can place guidance outside the usable canvas or across
  navbar, sidebar, graph controls, bottom toolbar and info panel.
- Users need an explicit visual “show me the control” path without restoring an automatic mandatory
  linear tour.

## Desired outcome

Design an implementation-usable revision where:

- checklist, manual short tour and contextual note have distinct jobs;
- controls have unambiguous lifecycle semantics;
- completion announces success and retires the checklist;
- incomplete guidance remains reachable across desktop, tablet and mobile;
- `Chỉ tôi` starts only a short, explicit, goal-specific tour;
- every workspace overlay respects a reactive Graph Safe Area;
- Help remains canonical and CGP-GUIDE-001 privacy/eligibility rules remain intact.

## Locked product decisions

Do not propose alternatives that contradict these decisions:

1. Hybrid guidance has three layers:
   - product-outcome checklist;
   - manual short tour started only through `Chỉ tôi`/explicit replay;
   - contextual note for difficult concepts, decisions, prerequisites or recovery.
2. The final eligible completion produces one short accessible announcement, then the checklist and
   automatic launcher retire.
3. Remove `Ẩn hướng dẫn bắt đầu` from the checklist card.
4. Collapse produces a launcher for the current visit.
5. `Để sau` closes automatic checklist presence for the current visit.
6. `Đặt lại hướng dẫn` exists only in Help or Settings.
7. Reopen/review does not reset product-derived completion or auto-start a tour.
8. Workspace overlays must remain inside a reactive Graph Safe Area and never overlap registered
   navigation/control/panel exclusion zones.
9. The mobile/tablet solution cannot be to hide the complete guidance capability.

## Already-approved parts to preserve

- Help is the canonical content source with stable topic IDs and traceable excerpts.
- Checklist completion comes only from confirmed product outcomes.
- Role/state/permission eligibility and conditional-topic exclusions.
- Device-local guidance state with no family content or private identifiers.
- Non-blocking behavior, manual reopen and privacy-safe return to Help/task.
- 44px minimum/48px target, keyboard, focus, screen reader, 200% scaling and reduced motion.
- Production/prototype synchronization with deterministic fictional data.
- No production analytics emission until separately approved.

## Affected journeys and surfaces

- Tree list checklist: incomplete, expanded, collapsed launcher, deferred, final completion, retired,
  reopened/review and reset entry.
- Populated tree workspace: checklist/launcher access and `Chỉ tôi` for eligible graph controls.
- Empty tree: preserve the primary task while supporting relevant manual help.
- Help and Settings: reopen/review and reset entry points with clear consequences.
- Contextual notes: coexistence with manual tour and collision rules.
- Desktop 1280×800, tablet 768×1024 and mobile 375×667.
- Layout changes: sidebar/drawer open/closed, info panel open/closed, graph controls and bottom toolbar,
  target present/absent/disabled/offscreen/relocated, orientation/resize and 200% text scaling.

## Required design work

Produce experience specifications, not final production code:

1. A revised state model covering collapse, defer, item completion, final completion announcement,
   retire, reopen/review and reset.
2. Automatic versus manual trigger matrix for checklist, tour and contextual notes.
3. Entry/exit/replay flow for `Chỉ tôi`, including cancel, target changes and fallback.
4. A goal-specific tour-step model that prevents it from becoming a generic mandatory linear tour.
5. Graph Safe Area specification:
   - registered exclusion zones;
   - target and overlay relationship;
   - placement priority;
   - behavior when no valid placement exists;
   - reactive behavior when bounds/layout change;
   - desktop/tablet/mobile recomposition.
6. Information hierarchy and Vietnamese copy recommendations that clearly distinguish collapse,
   defer, reopen/review and reset.
7. Accessibility specification for focus, Escape, announcements, screen-reader step semantics,
   reduced motion, touch targets and 200% scaling.
8. Required production/prototype states and visual-test matrix.
9. Reused versus changed patterns and rationale.

Do not prescribe a technical positioning library, DOM observer strategy or code architecture unless a
design constraint makes a specific behavior necessary.

## Required states

At minimum cover:

- checklist default/incomplete;
- collapsed launcher;
- deferred for current visit;
- current-visit explicit reopen;
- item completing;
- final completion announcement;
- retired;
- retired review/replay;
- reset entry, consequence explanation and result;
- manual tour not started/running/cancelled/completed;
- target visible, relocated, offscreen, disabled, absent and permission-ineligible;
- safe placement available/unavailable;
- viewport/layout changing while overlay is open;
- contextual note competing for the same space;
- loading, error, validation, modal/drawer conflict and destructive confirmation;
- desktop, tablet, mobile, 200% text and reduced motion.

## Product constraints and non-goals

- Do not restore an automatic tour.
- Do not make tour viewing a checklist completion signal.
- Do not redesign graph, app shell, navigation, toolbar, info panel or all of Help.
- Do not add chatbot, video, CMS, multilingual support, gamification or analytics.
- Do not add new product capabilities or publish conditional topics.
- Do not alter auth, privacy, permission, kinship, API or persistence contracts.
- Do not solve narrow breakpoints by hiding guidance access.
- Do not use permanent completion cards.

## Design acceptance criteria

- A user can distinguish collapse from defer from the control hierarchy and resulting behavior.
- `Ẩn hướng dẫn bắt đầu` is absent from the checklist card.
- Completed checklist announces once, retires and remains reviewable from Help/Hướng dẫn.
- Reset is separate, intentional and cannot undo outcomes derived from product state.
- `Chỉ tôi` is explicit, short and scoped to the selected goal; it is cancelable and replayable.
- No automatic trigger can start the visual tour.
- Tour/contextual fallback never points at a wrong, unavailable or unauthorized target.
- Every workspace overlay is specified relative to the Graph Safe Area, not viewport magic offsets.
- The design covers safe-area updates for all required layout and viewport state changes.
- Incomplete guidance remains reachable at all three required viewport sizes.
- No guidance surface obscures navbar, sidebar/drawer, graph navigation controls, bottom command
  toolbar, info panel, target control or viewport edge.
- Keyboard, focus restoration, Escape, screen-reader announcements, 44/48px targets, 200% scaling and
  reduced motion are explicitly covered.
- Canonical Help traceability, role gates, privacy and prohibited-feature exclusions remain intact.
- Prototype and visual verification states are complete and deterministic.

## Required deliverables

- Revised user-flow and lifecycle specification.
- Guidance-layer responsibility and trigger matrix.
- State transition diagram/table.
- Graph Safe Area behavior specification and exclusion-zone diagram.
- Desktop, tablet and mobile annotated references for the affected states.
- Manual `Chỉ tôi` tour specification with failure/recovery variants.
- Accessibility and responsive specification.
- Final Vietnamese control/copy deck for revised semantics.
- Prototype synchronization and visual verification matrix.
- Alternatives considered and tradeoffs.
- List of genuine PO/BA questions only; do not reopen locked decisions.

## Handoff requirement

Return a self-contained `DESIGN REVIEW PROMPT FOR PO/BA — CGP-GUIDE-002` that includes:

- artifact paths and versions;
- the original problem and desired outcome;
- proposed lifecycle and trigger rules;
- Graph Safe Area decisions and responsive evidence;
- state/accessibility/privacy coverage;
- exact mapping to every acceptance criterion in the product revision;
- reused and changed patterns;
- alternatives and tradeoffs;
- unresolved product questions, if any;
- a direct request for exactly one decision: `APPROVED`, `REVISION REQUIRED` or `REJECTED`.

PO/BA will inspect the actual artifacts rather than approving from the summary alone. Do not hand the
task to engineering until PO/BA records design approval.
