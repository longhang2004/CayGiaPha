# DESIGN REVIEW PROMPT FOR PO/BA — CGP-GUIDE-002

## Artifact paths and status

Version: 1.0 — Design review candidate, 2026-07-11
Root: `.agents/design/CGP-GUIDE-002/`

- `design-package.md` — complete interaction, lifecycle, safe-area, responsive, accessibility,
  prototype, and acceptance mapping specification.
- `visual-01-lifecycle.svg/.png` — collapse/defer/completing/retire/review/reset lifecycle.
- `visual-02-safe-area-desktop.svg/.png` — desktop exclusion zones and valid placement.
- `visual-03-safe-area-tablet.svg/.png` — tablet launcher/sheet recomposition.
- `visual-04-safe-area-mobile.svg/.png` — mobile toolbar/keyboard/200% fallback.
- `visual-05-manual-tour.svg/.png` — explicit `Chỉ tôi` goal tour and recovery.

## Original problem and desired outcome

The implemented CGP-GUIDE-001 foundation has ambiguous checklist controls, persistent completed
surfaces, missing mobile/tablet workspace checklist access, and viewport-offset placement that can
collide with navigation, graph controls, toolbar, panel, and viewport edges. Users also need an
explicit visual path to locate a control without restoring an automatic generic tour.

The revision makes checklist, manual short tour, and contextual note distinct; clarifies lifecycle
semantics; retires completed guidance; preserves access across all breakpoints; and places every
workspace overlay within a reactive Graph Safe Area. Canonical Help, eligibility, privacy,
product-derived completion, and CGP-GUIDE-001 exclusions remain unchanged.

## Current-state findings

- Current `collapsed` and `skipped` states render the same collapsed card.
- `hidden` creates a task-surface reopen button and competes with `Để sau`.
- Final completion still renders `Bạn đã hoàn tất…` rather than retiring.
- Workspace checklist is explicitly `display:none` at `≤768px`.
- Workspace guidance uses `top:7rem`, `right:1rem`, `bottom:11rem` rather than actual bounds.
- Contextual note and checklist share one fixed stack with no overlay priority or collision contract.
- No explicit `Chỉ tôi` action or goal-specific manual tour exists.

The affected deterministic prototypes were rendered at 1280×800, 768×1024, and 375×667 without
page overflow. The screenshots confirm semantic duplication, persistent completion, and loss of the
workspace checklist at small breakpoints.

## Revised lifecycle

- **Expanded incomplete:** normal checklist with task, `Chỉ tôi`, Help, collapse, and defer.
- **Collapse — `Thu gọn`:** creates an accessible next-step launcher for the current visit;
  progress is unchanged.
- **Defer — `Để sau`:** removes automatic checklist/launcher presence for the current visit;
  explicit reopen still works.
- **Item completion:** only after confirmed product outcome.
- **Final completion:** one polite announcement, then checklist and automatic launcher retire.
- **Retired:** no permanent completion card/badge/launcher.
- **Review/reopen:** explicit from Help/Hướng dẫn; preserves product completion and starts no tour.
- **Reset:** Help/Settings only; clears presentation/note/tour preferences, re-derives product
  completion, changes no product data, and starts no tour.

Final announcement:

`Bạn đã hoàn thành các bước bắt đầu. Bạn có thể xem lại trong Trợ giúp.`

`Ẩn hướng dẫn bắt đầu` is removed from the checklist card.

## Guidance-layer and trigger rules

| Layer | Responsibility | Automatic | Manual |
|---|---|---|---|
| Checklist | Next product outcome | First eligible expanded; returning incomplete launcher allowed | Launcher/Help/Hướng dẫn |
| Manual tour | Where/how to use selected control | Never | `Chỉ tôi` or explicit replay |
| Contextual note | Concept/prerequisite/permission/privacy/recovery | Conditional, non-blocking, one at a time | Local control or Help |
| Help | Full canonical instructions | Never | Existing Help/deep link |

No loading, validation, destructive confirmation, permission-denied, active drawer/modal, or unsafe
Graph Safe Area state may auto-show a surface.

## Manual `Chỉ tôi` decisions

- User explicitly chooses one eligible checklist goal.
- Invocation contains one goal and one to three necessary targets only.
- It cannot append unrelated features or become a generic tour.
- Cancel, Escape, route change, destructive flow, or eligibility loss stops the tour without
  completing/defering the checklist.
- Replay remains available.
- Visible target: outline + safe card.
- Relocated target: resolve visible semantic variant.
- Offscreen target: no auto-scroll; offer `Đưa tôi tới vị trí`.
- Disabled target: explain prerequisite, no misleading highlight.
- Absent/ineligible target: stop and provide checklist/Help recovery without revealing hidden action.
- Focus returns to the original `Chỉ tôi` trigger, surviving launcher, or relevant Help heading.

Approved Phase-1 goals remain create/open tree, first person, primitive relationship, inspect
address, viewpoint, graph navigation, and search. No conditional topic is published.

## Graph Safe Area decisions

Graph Safe Area equals current graph canvas bounds minus active registered exclusions, target
protection, and viewport/system safety insets. It may produce multiple candidate rectangles.

Registered exclusions:

- navbar/mobile top bar;
- expanded/collapsed sidebar;
- mobile drawer/scrim;
- responsive tree command/header toolbar and wrapped row;
- graph navigation controls;
- bottom command toolbar;
- info/details panel;
- open search/legend/menu popovers;
- modal/destructive surfaces;
- keyboard/IME/system inset;
- viewport-edge safety band;
- visible target protection zone plus 12px gap.

A placement is valid only when the full overlay, shadow, and focus ring fit inside a safe candidate
without intersecting exclusions or target and without obscuring primary actions.

Placement priorities:

- Desktop: right, left, below, above, safe dock, inline/Help fallback.
- Tablet: above/below, safe side, docked modeless sheet above actual toolbar, inline fallback.
- Mobile: target outline + modeless bottom sheet above actual toolbar/keyboard; no free-floating
  explanatory card over graph nodes.

When no placement is valid: remove connector/spotlight → docked sheet → inline card → stop/pause with
checklist/Help recovery. Never keep stale coordinates or an orphan tooltip.

## Reactive and collision behavior

Safe bounds are reevaluated after viewport/orientation, visual keyboard, text scale, sidebar/drawer,
info panel, toolbar wrapping, target geometry, menu/modal, or product layout changes.

- During change, remove connector/spotlight and safely dock or pause.
- After stable layout, place using actual rendered bounds.
- If no candidate remains, transition to fallback.
- Graph layout itself never shifts for guidance.
- Priority: blocking product UI → manual tour → user-opened note → auto note → launcher.
- Lower-priority surfaces yield without being marked dismissed/complete.

## State and responsive coverage

Covered states include incomplete, collapsed launcher, deferred, same-visit reopen, item completing,
final announcement, retired, retired review, reset entry/confirm/result, manual tour lifecycle,
target visible/relocated/offscreen/disabled/absent/ineligible, safe placement unavailable,
layout change, contextual competition, loading/error/validation, modal/drawer/destructive conflict,
desktop/tablet/mobile, 200%, and reduced motion.

- **1280×800:** safe-edge/idle-rail launcher and anchored target card.
- **768×1024:** launcher above actual toolbar; sheet fallback; drawer suspends overlay.
- **375×667:** 48×48 launcher; modeless sheet; visual-keyboard-aware placement; normal-flow fallback
  when 200% content cannot fit safely.

No supported breakpoint may hide the full guidance capability.

## Accessibility coverage

- Checklist is a named section/list with text progress.
- Launcher accessible name includes the next step; icon-only visual still has full name.
- Collapse and defer are separate visible controls with associated consequence copy.
- Final outcome announces once through a global polite live region.
- Manual tour is non-modal, named `Bước X trong Y`, does not trap focus, supports Escape, and restores
  focus on exit.
- Missing targets remove stale target descriptions and announce recovery once.
- All controls meet 44px minimum/48px target.
- At 200%, actions stack and fixed body heights are forbidden; unsafe overlay falls back.
- Reduced motion removes pulse/connector travel/reposition animation without losing meaning.
- Color, hover, gesture, spotlight, and connector are never the sole cue.

## Privacy, canonical content, and eligibility

- Every checklist, tour, and note excerpt continues to reference an active canonical Help topic ID.
- Device-local state contains only categorical guidance preferences and approved IDs.
- No family data, private ID, URL, target content, selector, or analytics event is persisted/logged.
- No production analytics is emitted.
- Role/permission gates remain intact; ineligible controls are neither revealed nor highlighted.
- Events/reminders, person-node claiming, account display-name guidance, password recovery, and all
  CGP-GUIDE-001 conditional/prohibited capabilities remain unpublished.

## Prototype and verification requirements

Deterministic variants must cover:

- tree list: incomplete, collapsed, deferred, completing, retired, review, reset;
- workspace: launcher, checklist, tour, note, none;
- target: visible, relocated, offscreen, disabled, absent, ineligible;
- layout: sidebar expanded/collapsed, drawer, info panel, menu, keyboard;
- Help/Settings: incomplete/retired review, reset confirmation/success.

Use fictional data and no authenticated/upcoming-events API. In addition to screenshots, automated
geometry checks must compare overlay bounds with every registered exclusion rectangle and fail on
any intersection.

## Exact acceptance-criterion mapping

| AC | Artifact evidence |
|---|---|
| AC1 | Package sections 4–5: distinct collapse/defer; hide removed |
| AC2 | Lifecycle + all-breakpoint launcher specifications and visuals 01/03/04 |
| AC3 | Deferred-current-visit observable contract |
| AC4 | Final announcement → retired, no persistent surface |
| AC5 | Review/reset separation and product-state re-derivation |
| AC6 | Manual-only trigger matrix and 1–3-step goal model; visual 05 |
| AC7 | Target recovery table and safe stop/fallback |
| AC8 | Safe-area exclusions/validity; visual 02 |
| AC9 | Reactive bounds contract for every required layout change |
| AC10 | Desktop/tablet/mobile launcher/sheet evidence; visuals 02–04 |
| AC11 | Accessibility section + 200%/reduced-motion matrix |
| AC12 | Canonical/role/privacy/exclusion preservation |
| AC13 | Deterministic prototype variants + geometry assertions |

## Reused and changed patterns

Reused unchanged:

- Canonical Help registry, stable IDs, role/state eligibility, product completion, semantic tokens,
  Help deep links, safe return, device-local privacy-safe state, and no analytics.

Changed:

- Split collapse from defer.
- Remove checklist `hidden` semantics/action.
- Add completing → retired and review-only completed state.
- Recompose tablet/mobile instead of CSS hiding.
- Add manual `Chỉ tôi` GoalTour.
- Register every workspace overlay with Graph Safe Area.

New experience contracts, not implementation libraries: `GuidanceLauncher`, `GoalTour`,
`Graph Safe Area`, and `GuidanceReset`.

## Alternatives and tradeoffs

- Rename but keep `Ẩn`: rejected; still overlaps defer.
- Keep completion card: rejected; permanent surface without next action.
- Restore automatic tour: rejected; violates non-blocking hybrid model.
- Per-viewport magic offsets: rejected; drift under actual layout/200%/keyboard.
- Hide small-screen guidance: rejected; removes capability.
- Manual goal tour + safe-area candidates + modeless fallback: recommended; requires disciplined
  shared geometry/state verification but satisfies all locked outcomes.

## Unresolved product questions

None. No locked decision has been reopened.

## Requested PO/BA decision

Inspect the complete package and all five annotated references, then record exactly one decision:

- `APPROVED`
- `REVISION REQUIRED`
- `REJECTED`

Do not hand the task to engineering before the decision is recorded. If revision is required,
identify the failed acceptance criterion, evidence, allowed correction scope, and already-approved
parts that must remain unchanged.
