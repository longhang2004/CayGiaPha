# Tree workspace UI audit — 2026-07-15

## Phạm vi

Audit populated workspace tại `/prototype/tree` sau khi migrate Open Design, tập trung vào bốn trạng thái `Danh sách`, `Sơ đồ`, drawer `Thao tác khác` và Coach mark ở desktop, tablet và mobile. Báo cáo này đã được cập nhật sau polish gate và broad audit cuối.

## Bằng chứng kiểm thử

- Targeted workspace, guidance, picker và graph component tests: 79/79 pass trên 15 test files.
- `npm run typecheck`: pass.
- `npm run lint`: pass, chỉ còn cảnh báo `<img>` được chấp nhận theo quy ước repository.
- `npm run build`: pass.
- `tests/e2e/prototype.spec.ts`: 81/81 pass.
- `tests/e2e/prototype-audit.spec.ts`: 60/60 pass, gồm 48 route baseline và 12 visual-state cases của workspace.
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

## Ảnh audit

### Desktop

- [Danh sách](./2026-07-15-tree-workspace-ui-audit/screenshots/desktop-tree-workspace-list.png)
- [Sơ đồ](./2026-07-15-tree-workspace-ui-audit/screenshots/desktop-tree-workspace-graph.png)
- [Thao tác khác](./2026-07-15-tree-workspace-ui-audit/screenshots/desktop-tree-workspace-actions.png)
- [Coach mark](./2026-07-15-tree-workspace-ui-audit/screenshots/desktop-tree-workspace-coach.png)

### Tablet

- [Danh sách](./2026-07-15-tree-workspace-ui-audit/screenshots/tablet-tree-workspace-list.png)
- [Sơ đồ](./2026-07-15-tree-workspace-ui-audit/screenshots/tablet-tree-workspace-graph.png)
- [Thao tác khác](./2026-07-15-tree-workspace-ui-audit/screenshots/tablet-tree-workspace-actions.png)
- [Coach mark](./2026-07-15-tree-workspace-ui-audit/screenshots/tablet-tree-workspace-coach.png)

### Mobile

- [Danh sách](./2026-07-15-tree-workspace-ui-audit/screenshots/mobile-tree-workspace-list.png)
- [Sơ đồ](./2026-07-15-tree-workspace-ui-audit/screenshots/mobile-tree-workspace-graph.png)
- [Thao tác khác](./2026-07-15-tree-workspace-ui-audit/screenshots/mobile-tree-workspace-actions.png)
- [Coach mark](./2026-07-15-tree-workspace-ui-audit/screenshots/mobile-tree-workspace-coach.png)

## Kết luận

Không còn P0–P3 mở trong phạm vi populated workspace của rollout này. Kết quả ở trạng thái commit-ready; integration E2E phụ thuộc local signup/database vẫn được ghi nhận riêng và không được che giấu như một pass.
