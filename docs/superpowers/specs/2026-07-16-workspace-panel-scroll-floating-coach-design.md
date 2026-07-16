# Design: Workspace panels, floating Coach marks and scroll ownership

## Mục tiêu

Sửa các lỗi bố cục quan sát được trong populated tree workspace và chuẩn hóa cách panel hoạt động trên mobile, tablet và desktop. Thay đổi phải giúp người lớn tuổi dễ nhận biết phần cố định, phần có thể cuộn và các thao tác chính mà không làm thay đổi capability, privacy projection, graph engine, API hoặc database.

Phạm vi gồm production `/tree/[id]` và prototype mirror `/prototype/tree`:

- Contextual Coach marks của action drawer, graph controls và person detail.
- Picker chọn người/đổi góc nhìn.
- Person info, create, edit và add-relative panel.
- Action drawer “Thao tác khác”.
- Graph controls responsive.

Không refactor toàn bộ `CGPDrawer`, sidebar ứng dụng hoặc các page family khác.

## Nguyên nhân hiện tại

- Contextual Coach card bị ép về `position: relative`, nên trở thành block trong normal flow và đẩy nội dung panel xuống.
- `CGPDrawer` và danh sách con đều có thể cuộn; trình duyệt chọn drawer ngoài làm scroll owner, khiến header, search và nút đóng rời khỏi viewport.
- Info panel đặt `overflow-y: auto` trên container ngoài, trong khi close button nằm bên trong nội dung; vì vậy toàn panel cuộn cùng nhau.
- Workspace stylesheet còn các selector legacy ghi đè lẫn nhau ở cuối cascade, tạo chiều cao và vị trí panel không nhất quán giữa breakpoint.
- Action drawer có bottom-sheet keyframes riêng nhưng vẫn nhận animation right-drawer chung ở một số trạng thái.
- Graph control list là một cột gồm chín mục, chiếm phần lớn canvas trên mobile.

## Kiến trúc panel trong workspace

Các panel được chạm tới dùng chung một cấu trúc bố cục, nhưng không tạo component framework mới:

1. `panel chrome`: header và nút đóng, không cuộn.
2. `panel body`: vùng duy nhất có `overflow-y: auto`, `min-height: 0` và overscroll containment.
3. `panel overlay`: lớp absolute phủ panel để hiển thị Coach card mà không tham gia normal flow.

Root panel dùng grid hoặc flex với `overflow: hidden`. Close button luôn nằm trong chrome hoặc overlay cố định, có target tối thiểu 44×44 CSS px, accessible name, focus ring và vẫn đóng bằng Escape thông qua primitive hiện tại.

Không thay đổi `CGPDrawer` toàn cục. Các class product-specific của picker và action drawer sẽ override scroll ownership; info panel dùng cùng contract trực tiếp trong `TreePageSlidePanel`.

## Floating contextual Coach marks

- `ContextualCoachMarks` tiếp tục dùng lifecycle, Help topic, persistence, Back/Next/Skip/Escape và anchor filtering hiện tại.
- Toàn workspace chỉ có một Coach sequence active tại một thời điểm. Khi một chapter mới mở, chapter đang nổi được đóng mà không ghi `skipped`; vì vậy Escape và focus restoration chỉ tác động chapter trên cùng.
- Card được render trong overlay layer của surface đang sở hữu nó, giữ nguyên DOM focus scope của drawer/panel.
- Card dùng absolute placement, không chiếm chiều cao nội dung. Action/person Coach căn trong panel; graph Coach nổi cạnh control palette.
- Active anchor vẫn có semantic outline. Card có max width, max height và internal scrolling khi 200% text; không che nút đóng.
- Surface body có thể cuộn độc lập phía dưới Coach. Khi Coach đóng, layout không nhảy.
- Overview Coach mark vốn đã floating tiếp tục giữ cơ chế graph-safe placement hiện tại.

## Picker chọn người và đổi góc nhìn

`TreePersonPicker` được chia thành:

- Chrome cố định: eyebrow, title, mô tả và close button.
- Filter cố định: search field và số kết quả.
- Result list: vùng cuộn duy nhất, bắt đầu sau divider và chiếm toàn bộ chiều cao còn lại.

Drawer có padding safe-area và khoảng thở phía trên rõ ràng. Các row vẫn full-width, tối thiểu 64 px, giữ selected state, tìm kiếm bỏ dấu và toàn bộ `persons` đã tải. Khi đóng, query được reset và focus quay về trigger như hiện tại.

## Person info panel

### Bố cục xem thông tin

- Chrome cố định chứa label ngữ cảnh ngắn và close button.
- Body cuộn chứa profile summary: avatar, tên và trạng thái sống/đã qua đời.
- Tabs “Chi tiết” và “Tiểu sử & Sự kiện” giữ semantics của `CGPTabs`, nhưng bỏ nested card lớn và giảm border/radius lồng nhau.
- Dữ liệu chi tiết dùng các row hoặc definition grid dễ quét; “Cách xưng hô” là callout rõ nhất nhưng vẫn dùng dữ liệu address hiện có.
- Action thường được gom trong một action section có spacing và hierarchy nhất quán. Action xóa được tách bằng divider/nhóm nguy hiểm, không đặt ngang hàng với chỉnh sửa.
- Claim, photos và upcoming events tiếp tục giữ capability/privacy behavior, nhưng nằm trong các section có heading và divider rõ ràng.

### Create, edit và add-relative

Ba mode dùng cùng fixed chrome và scroll body. Nút đóng chỉ thoát mode hiện tại như logic đang có; draft retention và form error behavior không đổi. Các inline layout style trong vùng chạm tới được chuyển sang scoped class.

### Responsive

- Mobile/tablet: bottom sheet cao theo viewport, chrome cố định ở trên, body cuộn; không cuộn workspace phía sau.
- Desktop: side panel ở bên phải, chiều rộng hiện tại được giữ trong khoảng hợp lý; chrome cố định và body cuộn riêng.
- 200% text: panel có thể cao tới safe viewport; không chuyển close button vào vùng cuộn và không gây horizontal overflow.

## Graph controls 4×2

Mobile/tablet hiển thị tám control trong grid bốn cột, hai hàng:

1. Phóng to.
2. Thu nhỏ.
3. Về người đang xem.
4. Đặt lại.
5. Tải SVG.
6. Toàn màn hình.
7. Chú giải.
8. Hướng dẫn nhanh.

Mỗi ô có icon, nhãn rút gọn, target tối thiểu 44×44 px và accessible name đầy đủ. “Hướng dẫn đầy đủ” trở thành text link dưới grid. Nếu có người đang chọn, “Căn giữa người chọn” được trình bày như contextual secondary action ngoài tám ô, không làm vỡ grid.

Desktop tiếp tục dùng control palette compact, không bắt buộc grid 4×2. Gesture equivalents và callback graph không đổi.

## Action drawer

- Mobile/tablet là bottom sheet thực sự: enter từ dưới lên, exit từ vị trí hiện tại xuống dưới.
- Selector product-specific vô hiệu hóa animation `translateX` chung của right drawer trong cả entering và exiting state.
- Chrome và close button cố định; tăng top padding, body action list cuộn riêng.
- Desktop vẫn là right side drawer và giữ animation ngang phù hợp.
- Contextual Coach nổi trong overlay, không đẩy action rows xuống.

## Accessibility và motion

- Giữ focus containment/restoration, Escape dismissal và outside-press policy của CGP primitives.
- Close button luôn nhìn thấy và reachable bằng keyboard.
- Chỉ vùng body/list là scroll container; dùng `overscroll-behavior: contain` và `scrollbar-gutter` khi phù hợp.
- `prefers-reduced-motion` tắt Coach/action drawer transition không thiết yếu.
- Coach card, grid controls và action rows giữ name/role/value, focus-visible và touch target contract.
- Light, dark và system theme chỉ dùng semantic tokens hiện có.

## Test contract

Unit/component tests phải chứng minh:

- Contextual Coach card dùng floating overlay contract và không nằm trong scroll body.
- Picker có chrome/filter cố định và một result-list scroll owner.
- Info/create/edit/add-relative panel có fixed close/chrome và một body scroll owner.
- Capability visibility và action callbacks không đổi với Owner, Contributor, Linked và Reader.
- Graph mobile control contract có tám grid item, contextual center action và Help link riêng.
- Action drawer nhận bottom-sheet exit contract trên mobile/tablet và right-drawer contract trên desktop.

Playwright kiểm tra `/prototype/tree` ở 375×667, 768×1024 và 1280×800, thêm 200% text cho panel/picker. Assertions gồm card nằm trong viewport, close button không di chuyển khi body scroll, header/filter không cuộn, không horizontal overflow và footer/header workspace không bị che.

Vì đây là thay đổi responsive/panel diện rộng, chạy broad `prototype-ui-audit` sau targeted tests và so sánh ảnh mới với screenshots lỗi do người dùng cung cấp.

## Giới hạn triển khai

- Không thêm dependency.
- Không đổi API, database, graph semantics, capability hoặc privacy behavior.
- Không thay đổi Help canonical content ngoài copy thật sự sai với UI mới.
- Production và `/prototype/tree` phải dùng chung component behavior.
- Không commit implementation nếu chưa được người dùng yêu cầu riêng.
