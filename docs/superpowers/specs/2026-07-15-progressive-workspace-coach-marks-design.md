# Design Doc: Progressive Workspace Coach Marks

## Mục tiêu

Mở rộng Coach mark của populated tree workspace từ một tour tổng quan ngắn thành hướng dẫn tăng dần theo ngữ cảnh. Người dùng chỉ thấy một lượng thông tin nhỏ ở mỗi lần tương tác, nhưng vẫn có thể khám phá đầy đủ các nhóm thao tác trong workspace, action drawer, graph controls và person detail panel.

Thiết kế ưu tiên người lớn tuổi và người ít tự tin với công nghệ: không tự mở drawer, không tự đổi tab, không ép người dùng thực hiện thao tác và không tạo một tour liên tục 10–12 bước.

## Phạm vi

- Production `/tree/[id]` và prototype mirror `/prototype/tree`.
- Tour tổng quan của workspace.
- Mini-tour trong action drawer, graph controls và person detail panel.
- Canonical Help content, localStorage migration, responsive placement và accessibility.
- Không thay đổi API, database, privacy projection, capability contract hoặc graph engine.

## Mô hình tương tác

### Tour tổng quan

Tự chạy một lần khi populated workspace và các anchor đã sẵn sàng. Tối đa năm bước, tự bỏ qua bước không có anchor hoặc không phù hợp với viewport:

1. Context hiện tại và đường quay lại Danh sách cây.
2. Đổi người làm điểm nhìn.
3. Danh sách/Sơ đồ trên mobile và tablet; desktop bỏ qua vì dùng split view.
4. Chọn một thành viên để xem thông tin và cách xưng hô.
5. Cụm tác vụ chính gồm Thêm người thân khi có capability và Thao tác khác.

### Mini-tour Thao tác khác

Tự chạy lần đầu khi action drawer được người dùng chủ động mở:

1. Tìm người và đổi góc nhìn.
2. Sửa người hoặc thêm thành viên khi capability cho phép; reader bỏ qua.
3. Cài đặt, cộng tác và Help theo capability thực tế.

Coach mark được render bên trong drawer để không thoát focus trap của modal.

### Mini-tour Điều khiển sơ đồ

Tự chạy lần đầu khi người dùng chủ động mở cụm Điều khiển sơ đồ:

1. Phóng to và thu nhỏ.
2. Căn giữa người đang xem/người được chọn và đặt lại vùng xem.
3. Toàn màn hình, tải SVG, chú giải và Help.

Các nút cùng mục đích được giải thích theo nhóm thay vì một Coach mark cho từng nút.

### Mini-tour Chi tiết thành viên

Tự chạy lần đầu khi một người được chọn và person detail panel mở ở trạng thái xem:

1. Thông tin và cách xưng hô.
2. Sửa thông tin, thêm quan hệ và đổi góc nhìn khi capability cho phép.
3. Claim hoặc ảnh khi các phần tương ứng tồn tại.

Mini-tour không chạy khi panel đang hiển thị create/edit/add-relative form để tránh che thao tác nhập liệu.

## Shared contract

### Chapter state

```ts
export type WorkspaceCoachChapter = "overview" | "actions" | "graph" | "person";
export type WorkspaceCoachStatus = "completed" | "skipped";

export interface WorkspaceCoachState {
  version: 2;
  chapters: Partial<Record<WorkspaceCoachChapter, WorkspaceCoachStatus>>;
}
```

`GuidanceState.schemaVersion` tăng từ 4 lên 5. Migration phải:

- Chuyển schema-4 `{ version: 1, status }` thành `chapters.overview = status`.
- Chuyển legacy `onboardingSkipped: true` thành `chapters.overview = "skipped"`.
- Giữ nguyên checklist completion và dismissed topic versions hợp lệ.
- Loại bỏ chapter, status hoặc dữ liệu không thuộc allowlist; tuyệt đối không lưu ID người/cây.

`recordWorkspaceCoachStatus(chapter, status, storage)` ghi riêng từng chapter và không ghi đè chapter khác.

### Replay event

`GUIDANCE_REOPEN_EVENT` tiếp tục được giữ để tương thích. Event không có detail mặc định replay `overview`; `CustomEvent` có `{ chapter }` replay đúng chapter. Các surface chỉ phản hồi event của chapter mình sở hữu.

### Step resolution

Mỗi step tham chiếu một canonical Help topic ID và một danh sách anchor ưu tiên. Resolver chọn anchor đầu tiên đang tồn tại và không nằm trong vùng `inert`/`aria-hidden`. Bước không có topic hợp lệ theo role hoặc không có anchor được bỏ qua.

## Component architecture

- `storage.ts`: schema-5 migration, chapter allowlist, status writer và typed replay helper.
- `CoachMarkSequence.tsx`: logic dùng chung cho chapter lifecycle, filtering anchor, Back/Next/Skip/Escape, highlight và focus restoration; card lấy nội dung từ `HELP_TOPICS`.
- `WorkspaceCoachMarks.tsx`: wrapper overlay cho chapter `overview`, tiếp tục dùng `GraphOverlayBoundary` để tránh header/footer/panel.
- `ContextualCoachMarks.tsx`: wrapper inline cho drawer, graph controls và person panel; nằm trong focus scope của surface hiện tại.
- Mỗi product surface chỉ khai báo step/anchor phù hợp và `enabled` state; không sao chép lifecycle logic.

## Canonical Help

Tận dụng các topic hiện có cho mở cây, đổi điểm nhìn, tìm/điều hướng, xem xưng hô, thêm quan hệ, chú giải, ảnh, settings và collaboration. Bổ sung topic canonical còn thiếu cho:

- Các tác vụ chính trong workspace.
- Sửa/thêm thông tin thành viên theo quyền.
- Xem, lưu và trình bày sơ đồ.

Component chỉ đọc `contextual` excerpt hoặc `summary`; không chứa copy hướng dẫn riêng.

## Accessibility và responsive

- Coach card giữ `role="dialog"`, `aria-modal="false"`, progress live region và accessible button labels.
- Có nút Quay lại từ bước 2, Tiếp theo/Hoàn tất, Bỏ qua và Escape.
- Khi đóng, focus quay về phần tử đã có focus trước khi chapter mở.
- Anchor đang hoạt động có focus outline semantic; không dựa riêng vào màu.
- Inline card nằm trong scroll/focus scope của drawer hoặc panel.
- Mobile card không che header/footer, chịu được 200% text và cuộn dọc khi cần.
- Reduced motion không thêm animation bắt buộc mới.

## Acceptance

- Overview tối đa 5 bước; contextual chapter tối đa 3 bước.
- Mỗi chapter chỉ tự chạy một lần và lưu độc lập.
- Owner, Contributor, Linked và Reader không thấy step cho action ngoài capability.
- Bước thiếu anchor được bỏ qua an toàn; không để tour bị kẹt.
- Không có coach card phía sau modal/drawer hoặc nằm ngoài focus trap.
- Production và `/prototype/tree` dùng chung component/behavior; prototype tests cover representative role states.
