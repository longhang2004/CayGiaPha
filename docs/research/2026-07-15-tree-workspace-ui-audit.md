# Tree workspace UI audit — 2026-07-15, cập nhật 2026-07-16

## Phạm vi

Audit populated workspace tại `/prototype/tree` sau khi migrate Open Design, tập trung vào `Danh sách`, `Sơ đồ`, picker đổi người, drawer `Thao tác khác`, person panel và Coach mark ở desktop, tablet và mobile. Bản cập nhật 2026-07-16 xác nhận scroll ownership, fixed chrome, floating Coach layer và graph controls 4×2 sau vòng reformat panel.

## Bằng chứng kiểm thử

- Toàn bộ frontend unit/component tests: 526/526 pass trên 111 test files.
- `npm run typecheck`: pass.
- `npm run lint`: pass, chỉ còn cảnh báo `<img>` được chấp nhận theo quy ước repository.
- `npm run build`: pass.
- `tests/e2e/prototype.spec.ts`: 89/89 pass.
- `tests/e2e/prototype-audit.spec.ts`: 69/69 pass, gồm 48 route baseline và 21 visual-state cases của workspace.
- Hai suite Playwright chạy cùng nhau: 158/158 pass trong Chromium.
- `tests/e2e/family-tree.spec.ts`: bị chặn ở bước signup do local API/Drizzle trả `Internal Server Error`, trước khi test đi tới workspace. Đây là giới hạn môi trường kiểm thử hiện tại, không phải lỗi UI được quan sát trong prototype.

## Findings và trạng thái xử lý

| Mức độ | Khu vực | Cách xử lý | Kết quả |
|---|---|---|---|
| P1 | Drawer `Thao tác khác` | Dùng surface opaque theo token; desktop là side drawer, mobile/tablet là bottom sheet; Close icon và target đạt 44×44px; row hover giữ nền trung tính. | Không còn xuyên/chồng chữ, không che navigation và thao tác đóng rõ ràng. |
| P1 | Coach mark | Hoãn hiển thị khi person panel/drawer đang mở; đo lại safe area theo DOM mutation; bỏ step không có anchor; tăng stacking/pointer contract. | Card nằm dưới header/tabs và trên footer ở cả ba viewport; có thể mở lại từ hướng dẫn. |
| P2 | Desktop split view | Không render tablist khi container chuyển sang split view. | Không còn affordance sai; list và graph được trình bày đồng thời. |
| P2 | Graph trên mobile | Automatic initial view giữ mức zoom đọc được và căn vào người đang xem; `Đặt lại` fit toàn cây theo cả chiều rộng lẫn chiều cao. | Ego node đạt tối thiểu 140px trong visual contract; cây cao không còn bị cắt khi reset. |
| P2 | Graph khi đổi selection/kích thước | Chọn người không đổi initial center; `ResizeObserver` giữ nguyên zoom và điểm giữa hiện tại khi panel đổi kích thước. | Pan/zoom người dùng đã chọn không bị reset khi mở detail hoặc layout reflow. |
| P2 | Graph controls desktop | Thu controls vào trigger có nhãn “Điều khiển sơ đồ”; mobile reset legacy `100dvh` để control luôn nằm trong canvas và trên footer. | Ý nghĩa control rõ hơn và mọi gesture đều có button tương đương. |
| P3 | Footer desktop | Gắn footer action với chiều rộng list rail trong split layout. | Graph không còn bị footer chiếm toàn dải ngang. |
| P3 | Reduced motion | Override cả trạng thái enter và exit của action bottom sheet bằng selector đủ specificity. | Không còn animation sót lại khi hệ điều hành yêu cầu giảm chuyển động. |
| P1 | Picker và action/person panel | Chia fixed chrome và một body/list cuộn duy nhất; root panel `overflow: hidden`; thêm safe-area padding. | Header, search và close button đứng yên khi cuộn nội dung ở cả ba viewport. |
| P1 | Contextual Coach trong action/graph/person | Đưa card vào absolute overlay layer theo chapter, tách khỏi scroll body và normal flow. | Coach không còn đẩy row/card, không che workspace chrome và vẫn giữ focus/persistence. |
| P2 | Person info panel | Bỏ nested card nặng, tách profile summary, facts, address callout, action thường và danger section. | Hierarchy dễ quét hơn; capability và action callbacks giữ nguyên. |
| P2 | Graph palette mobile/tablet | Gom đúng tám primary controls vào grid bốn cột hai hàng; đưa selected-center và Help đầy đủ ra ngoài grid. | Palette chiếm ít chiều cao hơn và mọi gesture vẫn có button tương đương. |
| P2 | Action drawer responsive | Dùng bottom-sheet translateY trên mobile/tablet và giữ right-drawer translateX trên desktop. | Hướng đóng/mở phù hợp với hình thái panel ở từng breakpoint. |
| P1 | Nhiều Coach chapter đồng thời | Sequence mới phát activation event; chapter cũ đóng mà không bị ghi `skipped`. | Chỉ chapter trên cùng nghe Escape và sở hữu focus/highlight; replay typed vẫn hoạt động. |
| P1 | 320×568 ở canonical 200% text | Dùng `cgp.textScale=200` trong regression test; giữ title/close của drawer cố định nhưng chuyển mô tả phụ vào body cuộn; đưa footer về normal flow và giữ surface cao 360px khi tổng fixed chrome vượt viewport. | Picker/action/person Coach thao tác được; danh sách không bị footer che và không có nội dung bị mất ở scale tối đa. |
| P2 | Split boundary | Định vị graph Coach theo graph rail thay vì toàn workspace; thêm geometry test tại ngưỡng split. | Coach không bị cắt khi graph rail vừa đủ chuyển sang desktop composition. |

Không phát hiện P0.

## Những phần đã đạt

- Không có horizontal overflow trong các viewport đã audit.
- Context bar mobile gọn, không vượt giới hạn 96px.
- List row full-width, trạng thái selected/hover/focus có vùng nhấn rõ.
- Footer mobile không che nội dung cuộn.
- Owner, Contributor, Linked và Reader giữ visibility theo capability.
- Picker dùng toàn bộ danh sách người, hỗ trợ tìm kiếm bỏ dấu và focus restoration.
- Graph có đường thao tác bằng button, không bắt buộc pan/pinch.
- Layout 320px với 200% text, reduced motion và keyboard interaction có test contract.
- Audit screenshot chờ transition/hydration, prime compositor và chỉ làm phẳng track transform trong lúc chụp graph; không còn black-tile artifact trong bộ ảnh bàn giao, còn swipe animation production không bị thay đổi.
- Picker, action drawer và person panel có đúng một `data-panel-scroll-region`; Playwright xác nhận chrome/close lệch không quá 1px sau khi cuộn.
- Graph palette có đúng tám child trong primary grid và bốn cột ở mobile/tablet.

## Ảnh audit

### Desktop

- [Danh sách](./2026-07-15-tree-workspace-ui-audit/screenshots/desktop-tree-workspace-list.png)
- [Sơ đồ](./2026-07-15-tree-workspace-ui-audit/screenshots/desktop-tree-workspace-graph.png)
- [Thao tác khác](./2026-07-15-tree-workspace-ui-audit/screenshots/desktop-tree-workspace-actions.png)
- [Coach mark](./2026-07-15-tree-workspace-ui-audit/screenshots/desktop-tree-workspace-coach.png)
- [Picker đổi người](./2026-07-15-tree-workspace-ui-audit/screenshots/desktop-tree-workspace-picker.png)
- [Person panel](./2026-07-15-tree-workspace-ui-audit/screenshots/desktop-tree-workspace-person.png)
- [Graph controls](./2026-07-15-tree-workspace-ui-audit/screenshots/desktop-tree-workspace-graph-controls.png)

### Tablet

- [Danh sách](./2026-07-15-tree-workspace-ui-audit/screenshots/tablet-tree-workspace-list.png)
- [Sơ đồ](./2026-07-15-tree-workspace-ui-audit/screenshots/tablet-tree-workspace-graph.png)
- [Thao tác khác](./2026-07-15-tree-workspace-ui-audit/screenshots/tablet-tree-workspace-actions.png)
- [Coach mark](./2026-07-15-tree-workspace-ui-audit/screenshots/tablet-tree-workspace-coach.png)
- [Picker đổi người](./2026-07-15-tree-workspace-ui-audit/screenshots/tablet-tree-workspace-picker.png)
- [Person panel](./2026-07-15-tree-workspace-ui-audit/screenshots/tablet-tree-workspace-person.png)
- [Graph controls](./2026-07-15-tree-workspace-ui-audit/screenshots/tablet-tree-workspace-graph-controls.png)

### Mobile

- [Danh sách](./2026-07-15-tree-workspace-ui-audit/screenshots/mobile-tree-workspace-list.png)
- [Sơ đồ](./2026-07-15-tree-workspace-ui-audit/screenshots/mobile-tree-workspace-graph.png)
- [Thao tác khác](./2026-07-15-tree-workspace-ui-audit/screenshots/mobile-tree-workspace-actions.png)
- [Coach mark](./2026-07-15-tree-workspace-ui-audit/screenshots/mobile-tree-workspace-coach.png)
- [Picker đổi người](./2026-07-15-tree-workspace-ui-audit/screenshots/mobile-tree-workspace-picker.png)
- [Person panel](./2026-07-15-tree-workspace-ui-audit/screenshots/mobile-tree-workspace-person.png)
- [Graph controls](./2026-07-15-tree-workspace-ui-audit/screenshots/mobile-tree-workspace-graph-controls.png)

## Kết luận

Không còn P0–P3 mở trong phạm vi populated workspace của rollout này. Kết quả ở trạng thái commit-ready; integration E2E phụ thuộc local signup/database vẫn được ghi nhận riêng và không được che giấu như một pass.
