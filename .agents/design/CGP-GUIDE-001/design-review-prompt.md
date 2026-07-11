# DESIGN REVIEW PROMPT FOR PO/BA

## Original product problem and desired outcome

CayGiaPha hiện có ba lớp hướng dẫn độc lập — modal giới thiệu, workspace tour và Help — không dùng
chung content architecture. Nội dung bị trùng, coverage không đều, chứa jargon và có nguy cơ khác
active Next.js runtime. Người mới, người lớn tuổi và người ít rành công nghệ chưa có đường dẫn rõ
từ lần đầu vào sản phẩm tới first value; người thành thạo có nguy cơ bị hướng dẫn lặp.

Outcome cần xác nhận:

- Người mới biết bước hữu ích tiếp theo mà không bị chặn.
- Checklist đạt first value bằng product state thật.
- Contextual guidance đúng role/state và dẫn tới đúng Help topic.
- Help là canonical content source duy nhất.
- Mọi lớp có thể bỏ qua và mở lại.
- Desktop/tablet/mobile, keyboard, reduced motion và 200% text scaling đều usable.
- Không quảng bá capability chưa active end-to-end.

## Design artifacts

- `design-package.md` — specification đầy đủ, version 1.0, chờ review.
- `visual-01-tree-list-checklist.svg/.png` — tree-list overview/checklist desktop.
- `visual-02-workspace-context.svg/.png` — populated workspace idle-rail checklist + contextual note.
- `visual-03-mobile-guidance.svg/.png` — mobile bottom-sheet fallback.
- `visual-04-help-topic.svg/.png` — canonical Help topic anatomy và return-to-task.

Artifact root: `.agents/design/CGP-GUIDE-001/`.

## Current-state findings

- `OnboardingModal` hard-code 4 steps and writes a 365-day dismissal cookie; dismiss and completion
  are indistinguishable; production has no reliable reopen path.
- `TreeWorkspaceTour` hard-code 5 steps and selectors; dismiss and completion both write one
  localStorage `seen` flag. Missing targets fall back to a centered card whose copy may no longer
  match the state.
- `SettingsModal` exposes a tutorial callback, but production tree page does not pass it.
- `HELP_TOPICS` owns a third copy set. It has stable anchors but paragraphs contain technical English,
  do not encode role/prerequisite/recovery, and contain collaboration/privacy claims that need correction.
- Existing Help is readable but long; current tests prove presence/anchors, not eligibility,
  excerpt traceability, return-to-task or version behavior.
- Render audit of tree/empty/help at 1280×800, 768×1024 and 375×667 passed with no page overflow.

## Proposed user flows

1. First eligible `/tree` visit shows a non-modal inline overview/checklist; normal page actions stay usable.
2. Checklist filters items by role/product state and advances only after a confirmed outcome.
3. Populated workspace does not auto-run a five-step tour. The idle info rail offers checklist status;
   at most one eligible contextual note may appear per visit.
4. Empty tree keeps the first-person form dominant and uses one inline excerpt only.
5. Returning users see a collapsed next step. `Để sau`, hide, completion and reopen are separate states.
6. A material topic version change affects only that topic; no complete checklist reset.
7. Checklist/context note opens `/help#<topic-id>`; Help focuses the topic heading and offers a safe
   browser-history return or tree-list fallback without logging a private URL.

## Guidance architecture and canonical content model

Recommended architecture:

`Canonical Help registry → overview excerpt / checklist excerpt / contextual excerpt / full Help topic`.

Every topic has stable ID, version, status, roles, purpose, prerequisites, steps, success, recovery,
privacy note, excerpt keys, related IDs, runtime evidence, owners and review date. Components receive
only `topicId + excerptKey`; explanatory copy is not duplicated in modal/tour arrays.

Content ownership:

- PO/BA: product truth, eligibility and approval.
- Designer: Vietnamese clarity, hierarchy, interaction and accessibility.
- Engineering: runtime evidence and regression enforcement; không tự viết lại product claims.

## Checklist items and completion logic

| ID | Item | Eligibility | Completion |
|---|---|---|---|
| `core-tree-open` | Tạo hoặc mở một cây | Signed-in | Authorized tree actually opened |
| `core-first-person` | Thêm người đầu tiên | Empty editable tree | Person count becomes ≥1 after success |
| `core-first-primitive` | Nối một quan hệ gần | Editable tree | Primitive edge becomes ≥1 after success |
| `core-inspect-address` | Chọn một người để xem xưng hô | Populated readable tree | Person selected and address resolves, including explicit `chưa xác định` |
| `core-viewpoint` | Thử đổi điểm nhìn | ≥2 readable people | Different viewpoint selected and address refresh completes |

Reader/non-editor variants never show create/edit items. Opening Help never completes an item.

## Contextual trigger, recurrence and reopen decisions

- One auto contextual note maximum per page visit.
- Only after layout stable; never during modal, form error, loading overlay or active keyboard sequence.
- Auto once per eligible topic/version; dismiss suppresses that version only.
- Manual replay always available through Help/guidance entry points.
- Visible target → anchored note; relocated target → visible variant; offscreen → no auto-scroll;
  disabled → explain prerequisite; absent/ineligible → render nothing; geometry failure → inline or
  bottom-sheet fallback without spotlight/scrim.
- Mobile never uses the spotlight tour.

## Coverage matrix summary

- All 25 catalogue journeys are mapped across overview/checklist/contextual/Help.
- Phase 1: create/open tree, first person, primitive relationship, select/address, viewpoint,
  basic graph navigation/search/legend, Help and display accessibility.
- Phase 2: dashed relation, privacy, region, sharing, photos, deletion and active collaboration roles.
- Conditional/unpublished: event/reminder, person-node claim and account display-name editing until approval.

## State and responsive coverage

- Covered: first visit, returning incomplete, complete, skip/dismiss, reopen, new version, no tree,
  empty/populated, all required role categories, target present/absent/disabled/offscreen/relocated,
  loading/error/offline, permission denied, privacy-redacted, deep link and return-to-task.
- Desktop: inline tree-list card, 320–360px idle rail, 320px safe anchored notes.
- Tablet: visible-target recomposition; inline fallback when geometry is unreliable.
- Mobile: 16px margins, content-driven bottom sheet up to 70dvh, internal scroll, maximum two footer actions.
- At 200%: normal-flow/bottom-sheet content, no fixed body height, actions wrap vertically.

## Accessibility coverage

- Semantic section/list/progress; status uses text/icon as well as color.
- Interactive content is not exposed as a tooltip; use named non-modal dialog/note as appropriate.
- Auto note does not steal focus. Manually opened sheet restores focus on close/Escape.
- Deep-linked Help heading receives focus.
- Concise polite announcement for confirmed checklist outcome.
- 44px minimum, 48px preferred targets; keyboard parity; reduced motion preserves all information.

## Privacy and measurement coverage

Allowed events: `guide_shown`, `guide_skipped`, `guide_completed`, `guide_reopened`,
`guide_help_opened`, `checklist_item_completed`, `guide_returned_to_task` with categorical topic,
surface, role, device and version only.

Prohibited: account/tree/person IDs (including hashes), names, emails, phone, dates, photos,
relationships, search text, free text, codes, tokens, private URLs and error bodies. If no approved
analytics platform exists, no substitute console/server logging is allowed.

## Final Vietnamese copy location

`design-package.md`, section 12 contains the complete copy deck and terminology map, including:

- Labels, helper, skip/hide/reopen/completion/return actions.
- Core checklist copy.
- Contextual, disabled, offline, API error, permission and privacy-redacted recovery copy.
- Owner/invitee collaboration copy.
- Replacement terms for technical English.

## Existing patterns reused and new patterns

Reused: warm paper cards, semantic tokens, existing buttons/focus states, idle info rail, Help route,
Help entry point, graph legend and current product forms/errors.

New: `GuidanceCard`, eligibility-filtered checklist, `ContextNote`, structured canonical `HelpTopic`
and safe `ReturnToTask`. These are experience patterns, not a framework/CMS rewrite.

## Alternatives considered

- Rewrite existing modal: rejected because it remains blocking and duplicated.
- Keep one long tour: rejected due selector fragility, mobile/200% problems and repetition.
- Checklist only: rejected because difficult concepts still need contextual explanation.
- Help only: rejected because it does not provide the next useful action.
- Recommended: inline overview + small checklist + contextual excerpts + canonical detailed Help.

## Assumptions

- Help remains the detailed content surface.
- Guidance state model is storage-agnostic and contains no family content.
- Safe browser history may support return-to-task without telemetry of private paths.
- Core state can be evaluated without collecting names, IDs or relationship content.

## Open product questions

1. Guide state đồng bộ đa thiết bị hay chỉ trên thiết bị hiện tại ở Phase 1?
2. Event/reminder và person-node claim có tiếp tục excluded đến approval riêng không?
3. Analytics provider và retention period nào được phép?
4. Có chấp thuận content review cadence mỗi quý + mỗi relevant feature release không?
5. Có chấp thuận checklist role variants được mô tả trong package không?

## Explicit feature eligibility/exclusion check

- Included in Phase 1: only capabilities with active Next.js UI/runtime evidence listed above.
- Password recovery is absent from all guidance copy and artifacts.
- No push/email/Zalo delivery, RSVP, host rotation, event calendar, advanced collaboration roles,
  import/export or roadmap capability is advertised.
- Event/reminder and node claim remain unpublished conditional topics.
- Photos are JPEG/PNG only when Phase 2 guidance is enabled.

## Prototype synchronization requirements

- Add deterministic tree-list prototype states: no tree/one tree and checklist
  expanded/collapsed/completed/skipped.
- Extend `/prototype/tree` with owner/collaborator/reader, checklist, contextual fallback,
  selected/unselected and collapsed-sidebar states.
- Extend `/prototype/tree/empty` with inline excerpt, loading/error/success and 200% states.
- Extend `/prototype/help` with direct topic, return-to-task, excluded-topic guard and mobile state.
- Guidance prototypes must not call real APIs; all fixtures are fictional.

## Requested PO/BA review

1. Inspect every artifact, not only this prompt.
2. Confirm the proposed architecture solves the original problem without expanding scope.
3. Confirm Phase 1 checklist items, role variants and completion signals.
4. Confirm trigger/recurrence/dismiss/reopen/version behavior.
5. Confirm stable topic catalogue, Phase 1/2 boundary and explicit exclusions.
6. Confirm Vietnamese copy, permission/privacy statements and instrumentation restrictions.
7. Resolve the five open product questions.
8. Record exactly one decision: `APPROVED`, `REVISION REQUIRED`, or `REJECTED`.

If revision is required, return a Design Revision Prompt specifying failed criteria, evidence,
allowed revision scope, already-approved parts and artifacts/checks that must be resubmitted.

