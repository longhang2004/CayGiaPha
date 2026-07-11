# Design Doc: Refactor Tree Page

## Tóm tắt (Goal Description)
Refactor cấu trúc của trang chính hiển thị cây gia phả (`frontend/src/app/tree/[id]/page.tsx` và `frontend/src/app/(prototype)/prototype/tree/page.tsx`) bằng cách tách nhỏ các UI components và tách logic quản lý State ra khỏi component hiển thị.
Mục tiêu là cải thiện khả năng bảo trì, giảm số lượng code trong file page mà **KHÔNG LÀM THAY ĐỔI** cấu trúc giao diện người dùng, đồng thời đảm bảo Sync giữa trang thật và trang Prototype.

## Các vấn đề hiện tại (Current Problems)
- File `tree/[id]/page.tsx` dài gần 700 dòng.
- Quản lý quá nhiều State (hơn 30 biến `useState`, `useEffect`).
- Các component con như Toolbar (Header) và Right Panel (Slide Panel) được code gộp trong một return block, khiến file rất khó đọc.
- Truyền (drill) hàng chục props cho các component con, gây khó khăn khi thêm tính năng mới.

## Đề xuất Giải pháp (Proposed Architecture)

Chúng ta sẽ áp dụng mô hình **Tách UI Components kết hợp Tree Context**:

### 1. Quản lý State bằng Context (`TreeContext.tsx`)
Tạo một Context API `TreeContext` (hoặc `useTreeState` custom hook nếu phù hợp hơn với App Router context) để lưu trữ toàn bộ các state quan trọng của cây:
- `persons`, `relationships`, `addresses`
- `activeTreeId`, `egoId`, `selectedId`, `focusId`
- `editMode`, `createMode`, `addRelativeMode`
- Lộ trình: Components con sẽ gọi `useTreeContext()` để lấy dữ liệu/hành động (actions) thay vì nhận từ props của page.

### 2. Tách UI Components
Sẽ tạo thư mục `frontend/src/components/tree-page/` để chứa các component được tách ra:
- **`TreePageHeader.tsx`**: Phần Toolbar nổi (chứa Logo, SearchPanel, Viewpoint, Các nút Actions như Cộng tác, Thêm thành viên).
- **`TreePageSlidePanel.tsx`**: Phần Panel bên phải trượt ra (chứa PersonInfoPanel, PersonForm, AddRelativeForm).
- **`TreePageMain.tsx`** (Optional): Wrap cho `TreeGraph` và loader.

### 3. Đồng bộ Prototype
Trang `(prototype)/prototype/tree/page.tsx` sẽ được refactor tương tự, sử dụng chung các component `TreePageHeader`, `TreePageSlidePanel` nhưng bọc trong `MockSessionProvider` và tiêm dữ liệu Mock thông qua Context.

## Open Questions & Review
- Prototype page yêu cầu giữ block `BEGIN/END mirror`. Việc tách component sẽ làm thay đổi cấu trúc import. Chúng ta sẽ thay đổi block này thành việc import các UI component thay vì code inline.

## Testing & Verification
- Sau khi tách, chạy lại `npm run typecheck`, `npm run lint`.
- Chạy Playwright test trên trang Prototype để đảm bảo UI không đổi.
- Kiểm tra lại các tính năng tương tác (Click node, xem thông tin, thêm người, sửa thông tin).
