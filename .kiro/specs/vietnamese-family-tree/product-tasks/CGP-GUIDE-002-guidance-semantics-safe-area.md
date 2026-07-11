# CGP-GUIDE-002: Làm rõ guidance controls và Graph Safe Area

Status: APPROVED FOR DESIGN
Type: Product revision / corrective enhancement
Priority: P1
Depends on: CGP-GUIDE-001
Design requirement: required
Rationale: thay đổi tác động trực tiếp đến guidance journey, trigger model, interaction semantics,
responsive placement, workspace collision avoidance, focus behavior và accessibility. Designer phải
xác định experience contract và responsive states trước khi engineering sửa implementation.

## 1. Classification and decision

CGP-GUIDE-002 là **task mới phụ thuộc CGP-GUIDE-001**, không phải chỉnh sửa hồi tố task 001.

Lý do:

- CGP-GUIDE-001 đã được phê duyệt và triển khai; canonical Help, outcome-based checklist và
  role/state eligibility vẫn là foundation đúng.
- Evidence mới đến từ visual review của implementation trên desktop, tablet và mobile.
- Thay đổi này bổ sung một lớp manual visual tour và một workspace positioning contract mới, đồng
  thời sửa semantics của controls đã triển khai. Đây là corrective enhancement có acceptance và
  verification riêng.
- CGP-GUIDE-001 phải được giữ làm historical baseline; CGP-GUIDE-002 supersede các quy tắc interaction
  xung đột được chỉ rõ trong tài liệu này.

## 2. Product validation

Các quyết định đã khóa phù hợp với product outcome và target users:

- **Người mới/người ít rành công nghệ:** checklist vẫn chỉ ra bước tạo giá trị; `Chỉ tôi` cung cấp
  minh họa trực quan đúng lúc mà không ép chạy tour tuyến tính.
- **Người lớn tuổi:** giảm hai lựa chọn có ý nghĩa gần nhau; completion kết thúc rõ ràng; overlay
  không che control hoặc làm mất ngữ cảnh.
- **Người thành thạo:** không có automatic tour; defer có hiệu lực theo lượt truy cập; checklist đã
  hoàn thành không chiếm chỗ lâu dài.
- **Người quay lại:** có launcher/reopen từ Help hoặc Hướng dẫn; reset là một hành động có chủ ý và
  không nằm trong luồng tác vụ chính.

Hybrid model giải quyết hai nhu cầu khác nhau mà không trộn semantics:

1. Checklist trả lời “tôi nên đạt outcome nào tiếp theo?”.
2. Manual tour trả lời “control đó ở đâu và dùng thế nào?”.
3. Contextual note trả lời “khái niệm hoặc quyết định này có nghĩa gì?”.

## 3. Problem and evidence

Implementation hiện tại có các vấn đề quan sát được:

- `Để sau` và `Ẩn hướng dẫn bắt đầu` cùng xuất hiện trên checklist nhưng khác biệt về thời hạn khó
  nhận biết, làm tăng cognitive load.
- Checklist hoàn tất vẫn render card/collapsed completion state, tiếp tục chiếm không gian dù không
  còn next action.
- Workspace CSS ẩn `.guidance-card` hoàn toàn ở breakpoint mobile/tablet, làm mất checklist thay vì
  recomposition.
- Guidance workspace dùng positioning và offsets gắn với viewport; bounds không phản ánh đầy đủ
  navbar, sidebar/drawer, graph controls, bottom toolbar, info panel và layout state.
- Contextual note giải thích nội dung nhưng không đáp ứng đầy đủ nhu cầu chủ động được chỉ đúng
  control trên graph.

Đây là bằng chứng implementation/visual review, không phải yêu cầu mở rộng feature catalogue.

## 4. Desired outcome

- Người dùng hiểu rõ tác dụng của từng guidance control mà không phải suy đoán thời hạn hoặc hậu quả.
- Checklist hiện diện và usable trên mọi supported viewport khi còn eligible/incomplete.
- Checklist tự retire sau completion và không chiếm không gian thường trực.
- Người dùng có thể chủ động gọi một tour ngắn để tìm control, nhưng không bao giờ bị auto-run hoặc
  ép hoàn thành một chuỗi tuyến tính.
- Mọi workspace overlay nằm trong Graph Safe Area đang khả dụng và tự thích nghi khi layout thay đổi.
- Canonical Help, outcome completion, role/permission gates và privacy rules từ CGP-GUIDE-001 được
  giữ nguyên.

## 5. Scope

### In scope

- Làm rõ semantics và copy hierarchy cho collapse, defer, complete, retire, reopen và reset.
- Loại bỏ `Ẩn hướng dẫn bắt đầu` khỏi checklist card.
- Retire checklist sau khi hoàn thành item eligible cuối cùng.
- Cung cấp checklist/launcher tương đương trên desktop, tablet và mobile; không CSS-hide toàn bộ
  functionality ở breakpoint nhỏ.
- Bổ sung manual, short, control-oriented tour qua action `Chỉ tôi` cho các bước eligible có target
  trực quan hữu ích.
- Xác định automatic/manual trigger, recurrence, cancel, completion và fallback của manual tour.
- Xác định Graph Safe Area contract cho mọi workspace overlay.
- Xác định behavior khi safe area thay đổi do resize, orientation, sidebar/drawer, info panel,
  navbar, graph controls, bottom toolbar, zoom/text scale hoặc layout state.
- Đồng bộ production/prototype và bổ sung deterministic states phục vụ visual/interaction testing.
- Giữ excerpt/copy dài trong canonical Help registry và stable topic mapping.

### Non-goals

- Không quay lại automatic linear tour.
- Không thiết kế một tour bắt buộc hoặc yêu cầu xem hết mới thao tác được.
- Không thay completion theo product outcome bằng completion theo tour.
- Không redesign graph, navbar, sidebar, command toolbar, info panel hoặc toàn bộ Help.
- Không thêm chatbot, video, CMS, đa ngôn ngữ, gamification hoặc analytics provider.
- Không thay auth, permission, privacy, kinship, API contract hoặc database schema.
- Không đưa capability conditional/unpublished của CGP-GUIDE-001 vào guidance.
- Không định nghĩa implementation library hoặc magic pixel offsets trong product requirement.

## 6. Locked guidance model

### 6.1 Outcome checklist

- Checklist giữ item eligibility và completion signals đã duyệt trong CGP-GUIDE-001.
- Checklist không dùng tour-viewed, Help-opened, note-dismissed hoặc control-highlighted làm completion.
- Mỗi item có thể cung cấp action thực hiện task, `Chỉ tôi` khi có target phù hợp, và link Help khi
  cần giải thích sâu; Designer quyết định hierarchy trong giới hạn này.
- Checklist incomplete phải có đường truy cập usable trên desktop, tablet và mobile.

### 6.2 Manual short tour

- Chỉ bắt đầu sau explicit user action `Chỉ tôi` hoặc manual replay tương đương từ Help/Hướng dẫn.
- Không tự chạy ở first visit, returning visit, new version, route entry hoặc sau khi hoàn thành một
  checklist item.
- Tour chỉ bao gồm target cần thiết cho mục tiêu người dùng vừa chọn; không nối các feature không
  liên quan thành một chuỗi tổng quát.
- Người dùng có thể thoát ở mọi bước. Thoát tour không defer checklist, không complete item và không
  dismiss contextual note.
- Tour không thay đổi product data.
- Khi target mất eligibility, absent, disabled hoặc không thể đặt overlay an toàn, tour không hiển
  thị orphan tooltip. Nó phải dừng hoặc dùng fallback không trỏ sai, đồng thời cung cấp recovery phù
  hợp như quay lại checklist hoặc mở đúng Help topic.
- Manual tour có thể được chạy lại; việc đã xem không làm mất quyền replay.

### 6.3 Contextual note

- Dùng cho khái niệm, prerequisite, permission, privacy, choice hoặc recovery cần giải thích tại chỗ.
- Có thể auto-show theo recurrence rule đã duyệt nếu note không chặn thao tác, đúng role/state và nằm
  an toàn; không tự chuyển thành multi-step tour.
- Contextual note không dùng để chỉ tuần tự nhiều control.

## 7. Automatic versus manual trigger rules

| Surface | Automatic allowed | Manual entry | Product rule |
|---|---|---|---|
| Checklist first eligible visit | Có, expanded/visible theo state đã duyệt | Help/Hướng dẫn/launcher | Không chặn; chỉ item eligible |
| Checklist returning incomplete | Có thể hiện launcher/collapsed state | Launcher/Help/Hướng dẫn | Không auto-expand lặp vô lý |
| Manual short tour | Không | `Chỉ tôi` hoặc replay explicit | Chỉ mục tiêu vừa chọn; cancel bất kỳ lúc nào |
| Contextual note | Có điều kiện | Help/Hướng dẫn hoặc trigger tại control | Tối đa một auto note phù hợp tại một thời điểm; không trộm focus |
| Completed checklist | Announce rồi retire | Reopen từ Help/Hướng dẫn | Không để completion card thường trực |
| Reset | Không | Chỉ Help/Cài đặt | Explicit confirmation nếu hậu quả chưa đủ rõ |

Không surface nào được tự kích hoạt trong loading overlay, validation error, destructive confirmation,
permission-denied context, active modal/drawer conflict hoặc khi Graph Safe Area không đủ chỗ.

## 8. Locked state semantics

### Collapse — `Thu gọn`

- Chuyển checklist đang mở thành launcher nhỏ trong **lượt truy cập hiện tại**.
- Không đánh dấu defer, dismiss, complete hoặc reset.
- Không thay product completion state.
- Launcher phải còn keyboard/touch accessible và không bị ẩn ở tablet/mobile.

### Defer — `Để sau`

- Đóng checklist/launcher tự động của **lượt truy cập hiện tại**.
- Không đánh dấu complete và không xóa progress.
- Không chặn manual reopen trong cùng lượt từ Help/Hướng dẫn nếu người dùng chủ động yêu cầu.
- Lượt truy cập eligible sau có thể đưa checklist trở lại theo recurrence rule; không yêu cầu reset.

### Complete

- Xảy ra riêng cho từng item khi product outcome đã được xác nhận.
- Không xảy ra vì xem tour, mở Help, đóng note, collapse hoặc defer.
- Khi item eligible cuối cùng hoàn thành, phát một announcement ngắn, không phụ thuộc màu/chuyển động.

### Retire

- Sau final completion announcement, checklist card và automatic launcher biến mất khỏi task surface.
- Retire không xóa completion history và không đồng nghĩa reset.
- Không để permanent “đã hoàn thành” card trong tree list/workspace.
- Help/Hướng dẫn vẫn cung cấp reopen/review entry.

### Reopen / review

- Là explicit user action từ Help/Hướng dẫn hoặc entry point đã duyệt.
- Với checklist incomplete: mở current progress/next eligible item.
- Với checklist retired: cho phép xem lại các bước hoặc chạy manual guidance mà không tự đổi completed
  items thành incomplete.
- Reopen không tự chạy tour; người dùng tiếp tục chọn `Chỉ tôi` nếu cần.

### Reset — `Đặt lại hướng dẫn`

- Chỉ xuất hiện trong Help hoặc Cài đặt, không nằm trên checklist card hoặc contextual note.
- Là explicit user action có accessible name và mô tả hậu quả.
- Reset chỉ xóa UI guidance state được phép lưu: collapse/defer/dismiss/tour-view state và replay
  preferences theo contract được duyệt.
- Reset không xóa hoặc sửa product data.
- Outcome có thể suy ra từ product state vẫn phải được coi là complete; reset không được làm người
  dùng lặp lại việc đã thực sự hoàn thành.
- Reset không bật automatic tour.

## 9. Graph Safe Area product contract

Graph Safe Area là phần canvas hiện tại còn khả dụng cho guidance overlay sau khi loại trừ mọi vùng
đang chiếm chỗ hoặc cần tương tác độc lập:

- top navbar/header;
- sidebar hoặc drawer ở trạng thái hiện tại;
- graph navigation controls;
- bottom command toolbar;
- info/details panel;
- viewport-edge safety margin;
- keyboard/IME hoặc system inset khi có ảnh hưởng trên mobile;
- các modal, menu hoặc blocking surface đang mở.

Requirements:

- Mọi tour highlight, popover, contextual note, callout và launcher đặt trên workspace phải nằm trong
  safe area hoặc dùng approved non-overlay fallback.
- Không che target được hướng dẫn, primary navigation, graph controls hay command toolbar.
- Bounds phải được tính từ actual layout state, không chỉ viewport và magic offsets.
- Bounds/placement phải cập nhật khi viewport, orientation, text scale, sidebar/drawer, info panel,
  toolbar hoặc target geometry thay đổi.
- Placement update không được tạo visible jump kéo dài, orphan tooltip hoặc layout shift của graph.
- Nếu không có placement hợp lệ, ưu tiên không render overlay sai; dùng inline/sheet/Help fallback do
  Designer xác định.
- Safe-area behavior phải tương đương về outcome trên desktop, tablet và mobile; không được giải quyết
  breakpoint nhỏ bằng `display: none` cho toàn bộ checklist/guidance access.

## 10. UX, accessibility and privacy requirements

- Guidance luôn non-blocking và có close/cancel rõ ràng.
- Automatic contextual note không lấy focus; manual tour có focus order hợp lý và trả focus về
  trigger/target hợp lệ khi đóng.
- Escape đóng current manual overlay/tour step theo interaction contract, không thay progress.
- Target và controls tối thiểu 44×44px, mục tiêu 48×48px.
- Không dùng màu, animation, hover, spotlight hoặc đường nối làm tín hiệu duy nhất.
- 200% text scaling và reduced motion phải giữ đủ nội dung và thao tác.
- Screen reader phải phân biệt launcher, checklist progress, tour step, close/cancel và completion.
- Placement không làm nội dung ra ngoài viewport hoặc che toolbar ở 1280×800, 768×1024 và 375×667.
- Không ghi family data, private IDs, target URLs hoặc target content vào guidance state/logs.
- Giữ nguyên role/permission eligibility; không reveal control mà người dùng không được phép dùng.

## 11. Acceptance criteria

### AC1 — Unambiguous controls

Given checklist đang mở,
when user reviews available controls,
then card có collapse và defer với semantics khác biệt theo mục 8, và không còn action `Ẩn hướng dẫn
bắt đầu`.

### AC2 — Collapse is session-local launcher

Given incomplete checklist,
when user chooses collapse,
then checklist becomes an accessible launcher for the current visit, progress is unchanged, and the
launcher remains available at desktop, tablet and mobile supported sizes.

### AC3 — Defer closes current visit

Given incomplete checklist,
when user chooses `Để sau`,
then automatic checklist presence closes for the current visit without completing, resetting or
permanently hiding progress; explicit reopen remains possible.

### AC4 — Completion retires the card

Given the last eligible checklist outcome becomes confirmed,
when completion state updates,
then one concise accessible success announcement is emitted and the card/automatic launcher retires
without leaving a permanent completion surface.

### AC5 — Reopen and reset remain distinct

Given a retired or deferred guide,
when user reopens it from Help/Hướng dẫn,
then existing outcome completion remains intact and no tour auto-starts. `Đặt lại hướng dẫn` exists
only in Help/Cài đặt and cannot undo product-derived completion.

### AC6 — Manual-only visual tour

Given an eligible checklist item with a useful visible control target,
when user explicitly selects `Chỉ tôi`,
then a short target-oriented tour begins. It never begins automatically and cancel/close does not
complete or defer the checklist item.

### AC7 — Tour target recovery

Given a target is absent, disabled, offscreen, relocated, role-ineligible or loses eligibility during
the tour,
when placement is evaluated,
then no orphan or misleading overlay appears; guidance stops or uses an approved safe fallback with
recovery to the correct task/Help topic.

### AC8 — Graph Safe Area

Given any supported viewport and layout state,
when a workspace overlay is visible,
then its rendered bounds remain within the current Graph Safe Area and do not intersect navbar,
sidebar/drawer, graph controls, bottom command toolbar, info panel or viewport-edge exclusion zones.

### AC9 — Reactive bounds

Given a visible workspace overlay,
when resize, orientation, sidebar, drawer, info panel, toolbar, target geometry or text scale changes,
then placement is recomputed from actual layout bounds and remains safe without magic-offset drift,
or transitions to the approved fallback.

### AC10 — Cross-breakpoint availability

Given an eligible incomplete checklist,
when tested at 1280×800, 768×1024 and 375×667,
then the checklist or its accessible launcher is reachable and usable; no breakpoint hides the entire
guidance capability through CSS.

### AC11 — Accessibility and responsive behavior

Keyboard, screen reader, Escape/focus restoration, 44px minimum/48px target, 200% text scaling and
reduced motion pass for checklist, launcher, manual tour, contextual note, retire/reopen and reset.

### AC12 — Canonical content and privacy preserved

All checklist/tour/contextual excerpts remain traceable to active canonical Help topic IDs; no
conditional capability is published and no private family content or identifier is persisted/logged.

### AC13 — Production/prototype parity

Affected production and prototype surfaces expose deterministic equivalent states for incomplete,
collapsed, deferred, completing/retired, reopened, reset, manual-tour target variants and safe-area
layout variants, using fictional data and no real authenticated/upcoming-events API call.

## 12. Success criteria and measurement

Do not add production telemetry until the separate analytics/privacy gate from CGP-GUIDE-001 is
approved. Validate first through moderated usability sessions, accessibility testing, visual
regression and automated geometry assertions.

Success criteria:

- Users in usability testing can correctly explain collapse versus defer without facilitator help.
- No participant expects completion/reset after choosing collapse or defer.
- Eligible participants can find and use `Chỉ tôi`, cancel it and resume the task without losing
  checklist progress.
- Completed checklist leaves no persistent card while Help/Hướng dẫn still enables review.
- Zero detected overlap between guidance overlay bounds and registered exclusion zones across the
  required viewport/layout matrix.
- Zero supported breakpoint where incomplete guidance is unreachable because of CSS hiding.
- No regression in canonical Help traceability, role eligibility, product-derived completion,
  keyboard/focus behavior or privacy rules.

Candidate future aggregate metrics, only after analytics approval:

- collapse, defer, reopen, reset and retire rate as separate categorical events;
- `Chỉ tôi` start, cancel and target-success rate by topic/surface/device category;
- safe fallback rate by categorical cause, without selector, URL, ID or family content;
- first-value completion and abandonment guardrails from CGP-GUIDE-001.

## 13. Risks and assumptions

- A safe-area contract may require a shared layout/geometry abstraction; implementation detail belongs
  to Orchestrator after design approval.
- Excessive tour steps would recreate the rejected linear-tour problem; Designer must keep each
  invocation goal-specific and short.
- A launcher can still obscure controls if treated as another fixed viewport overlay; it is subject to
  the same safe-area contract.
- Retire animation must not delay accessibility state or cause layout shift; motion is optional and
  cannot carry meaning.
- “Current visit” needs an engineering definition consistent across client navigation without being
  converted into permanent hide. Designer defines observable behavior; Orchestrator defines the
  smallest reliable implementation.

## 14. Design gate

Design decision: required
Product status: APPROVED FOR DESIGN

Designer must return a self-contained DESIGN REVIEW PROMPT for PO/BA. Engineering orchestration must
not begin until the revised design package is explicitly approved.
