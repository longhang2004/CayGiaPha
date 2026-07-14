# Nghiên cứu UI/UX mobile cho người lớn tuổi và người ít tự tin công nghệ

**Ngày nghiên cứu:** 2026-07-13
**Trạng thái:** Research trước Plan mode; chưa phải thiết kế, backlog hay quyết định triển khai
**Sản phẩm:** Cây Gia Phả — mobile web tiếng Việt
**Nhóm trọng tâm:** Người Việt từ 60 tuổi trở lên và người có mức tự tin công nghệ thấp

## Kết luận điều hành

Vấn đề chính không còn nằm ở việc bổ sung thêm một checklist accessibility kỹ thuật. Sản phẩm đã có
nền tảng tốt: cỡ chữ 100–200%, tương phản, semantic controls, keyboard navigation và touch target
44–48 CSS px. Tuy nhiên, một giao diện vẫn có thể đạt WCAG mà người lớn tuổi không biết bắt đầu từ
đâu, không hiểu icon, sợ bấm sai hoặc phải ghi nhớ hướng dẫn từ một trang khác.

Hướng nghiên cứu có tín hiệu mạnh nhất là giảm "khoảng cách nhận thức": tác vụ cốt lõi phải hiện ra
bằng từ ngữ quen thuộc, mỗi thời điểm chỉ có một quyết định chính, trạng thái và hậu quả của thao tác
phải rõ, và lỗi phải khôi phục được. Trên mobile, sơ đồ cây không nên là cách duy nhất để tìm hoặc sửa
người thân; pan, zoom, drag và ký hiệu đường nối cần có phương án tap/list/search tương đương.

Trang Help vẫn phải tồn tại để đáp ứng Requirement 17 và làm nguồn tham khảo canonical, nhưng không
nên gánh toàn bộ việc dạy người dùng. Hướng dẫn hiệu quả hơn khi được phân phối theo lớp: empty state,
gợi ý ngay cạnh control, checklist theo tác vụ, giải thích ngắn theo ngữ cảnh, rồi mới tới Help đầy đủ.

Không có đủ bằng chứng trực tiếp để coi người lớn tuổi Việt Nam là một nhóm đồng nhất hoặc để chốt
một "Senior mode" riêng. Mặc định nên là trải nghiệm đơn giản, rõ ràng cho mọi người; personalization
hoặc simplified mode chỉ là lựa chọn bổ sung và phải được kiểm chứng với người dùng thật.

## Phương pháp và giới hạn

Research brief chi tiết được giao cho Gemini Deep Research với Google Search. Brief yêu cầu ưu tiên
mobile, cognitive accessibility, người lớn tuổi, low digital literacy, Help/onboarding, graph/family
tree, tối thiểu 18 nguồn trực tiếp và 5 bài peer-reviewed. Phiên nghiên cứu trả về 224 mục liên kết
trước khi tổng hợp báo cáo; con số này có bao gồm nguồn trùng lặp và nguồn secondary.

Codex sau đó thực hiện quality screen, đối chiếu các claim quan trọng với nguồn chính thống W3C,
Apple, Android, GOV.UK, NHS và các systematic review. Những chi tiết benchmark không có nguồn mạnh
hoặc suy diễn quá phạm vi nguồn không được chuyển thành rule.

Giới hạn quan trọng:

- Chưa có nghiên cứu thực địa trên người dùng hiện tại của Cây Gia Phả.
- Bằng chứng chuyên biệt cho người lớn tuổi Việt Nam và thao tác cây gia phả trên mobile còn yếu.
- Phần lớn nghiên cứu older-adult UI đến từ y tế, dịch vụ công hoặc mobile app; cần kiểm chứng trước
  khi chuyển sang web app gia phả.
- "Người lớn tuổi" không đồng nghĩa với "khuyết tật" hoặc "không biết công nghệ". Recruitment và
  product copy không nên dùng nhãn mang tính hạ thấp như "mù công nghệ".

## Accessibility kỹ thuật chưa đủ

Ba lớp cần được đo riêng:

| Lớp | Câu hỏi cần trả lời | Bằng chứng |
|---|---|---|
| Compliance | Control có tên/role, tương phản, resize, keyboard và target đủ chuẩn không? | Automated + manual accessibility audit |
| Usability | Người dùng có hoàn thành tác vụ đúng, ít lỗi và không cần trợ giúp không? | Moderated usability testing trên mobile thật |
| Cognitive accessibility | Người dùng có hiểu từ ngữ, lựa chọn, trạng thái và hậu quả mà không phải ghi nhớ không? | Task observation, neutral probes, confidence/SEQ |

[W3C Older Users](https://www.w3.org/WAI/older-users/) cho thấy nhu cầu của người lớn tuổi giao thoa
với WCAG nhưng không kết thúc ở conformance. [W3C COGA](https://www.w3.org/TR/coga-usable/) đi xa
hơn ở khả năng hiểu, giữ tập trung, ghi nhớ và hoàn thành tác vụ. Vì vậy, 29/29 a11y tests hoặc không
có axe violation không đủ để kết luận sản phẩm dễ dùng với người lớn tuổi.

## Các rule có độ tin cậy cao

### 1. Touch target của sản phẩm nên giữ 48 CSS px khi có thể

- WCAG 2.2 AA SC 2.5.8 chỉ đặt floor 24×24 CSS px hoặc spacing tương đương; chính W3C lưu ý control
  vẫn có thể khó bấm dù đạt floor này.
- WCAG 2.2 AAA SC 2.5.5 dùng 44×44 CSS px.
- Android khuyến nghị 48×48 dp, khoảng cách 8 dp; Apple dùng hệ quy chiếu point, không được trộn với
  CSS px hoặc Android dp.
- Với nhóm trọng tâm của sản phẩm, giữ rule hiện tại: **không dưới 44×44 CSS px; ưu tiên 48×48** cho
  mọi action chính, navigation, Help, close và destructive control.
- Đo cả khoảng cách, overlap và accidental activation; không chỉ đo icon nhìn thấy.

Nguồn: [WCAG 2.5.8](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html),
[WCAG 2.5.5](https://www.w3.org/WAI/WCAG22/Understanding/target-size-enhanced.html),
[Android touch target](https://support.google.com/accessibility/android/answer/7101858?hl=en).

### 2. Action cốt lõi phải nhìn thấy và có nhãn chữ

- Không dựa vào icon-only cho các action như Thêm người thân, Sửa, Đổi góc nhìn, Mời, Xóa, Help.
- Icon có thể hỗ trợ nhận diện, nhưng nhãn phải mô tả hành động bằng tiếng Việt đời thường.
- Không đặt action cốt lõi chỉ sau swipe, long-press, hover hoặc context menu.
- Secondary controls có thể compact hơn nếu vẫn có accessible name và không ảnh hưởng task discovery.

Đây là rule cho **core task**, không phải lệnh cấm mọi icon-only control trong toàn hệ thống.

Nguồn: [W3C guidance cho older users](https://www.w3.org/WAI/older-users/developing/),
[systematic review về mobile app cho người lớn tuổi](https://pmc.ncbi.nlm.nih.gov/articles/PMC10557006/).

### 3. Gesture không được là con đường duy nhất

- Pan, pinch-to-zoom, drag-and-drop, double-tap và long-press cần phương án single tap tương đương.
- Sơ đồ cây cần control hiển thị rõ để phóng to/thu nhỏ, đưa người đang chọn vào giữa và quay lại.
- Tác vụ quản lý quan hệ không nên yêu cầu người dùng kéo node hoặc vẽ edge.
- Khi mật độ graph bắt buộc cao, cung cấp list/search/person-centric view tương đương.

Nguồn: [WCAG 2.5.7 Dragging Movements](https://www.w3.org/WAI/WCAG22/Understanding/dragging-movements.html),
[systematic review age-friendly mobile design](https://pmc.ncbi.nlm.nih.gov/articles/PMC12350549/).

### 4. Giảm recall, tăng recognition

- Mỗi màn hình hoặc step chỉ nên có một quyết định chính; secondary data dùng progressive disclosure.
- Hiển thị lựa chọn có nghĩa thay vì bắt người dùng nhớ thuật ngữ, mã, trạng thái hoặc cấu trúc menu.
- Giữ Back, Home/Tree và Help ổn định; quay lại không làm mất dữ liệu đã nhập.
- Hiện rõ đang xem ai, đang thao tác cây nào, có quyền gì và bước tiếp theo là gì.
- Không dùng modal/tour để truyền một lượng lớn kiến thức trước khi người dùng cần nó.

Nguồn: [W3C COGA](https://www.w3.org/TR/coga-usable/),
[GOV.UK form structure](https://www.gov.uk/service-manual/design/form-structure),
[GOV.UK question pages](https://design-system.service.gov.uk/patterns/question-pages/).

### 5. Typography phải dễ đọc nhưng không biến heuristic thành tiêu chuẩn giả

- Giữ mặc định ít nhất 16 CSS px cho body trên mobile như một product heuristic, rồi kiểm thử với
  font tiếng Việt thật; đây không phải một WCAG success criterion độc lập.
- Hỗ trợ text scale 100–200%, reflow, zoom trình duyệt và virtual keyboard mà không mất chức năng.
- Giữ line-height thoáng, dòng không quá dài, phân cấp heading rõ và tương phản đúng Requirement 18.
- Các giá trị text-spacing trong WCAG là khả năng chịu override của người dùng, không phải yêu cầu
  mọi thiết kế phải mặc định letter-spacing 0.12em.
- Tránh text phụ quá nhỏ, font weight quá mảnh và placeholder thay cho label.

Nguồn: [W3C Older Users](https://www.w3.org/WAI/older-users/),
[W3C COGA](https://www.w3.org/TR/coga-usable/).

### 6. Form và auth phải giảm chuyển ngữ cảnh

- Baseline sản phẩm là email + password hoặc Google; không giả định phone/OTP.
- Cho phép password manager, paste, autofill, show/hide password và autocomplete đúng mục đích.
- Không yêu cầu nhập lại dữ liệu đã cung cấp trong cùng flow; giữ lại field đã đúng khi field khác lỗi.
- Error đặt cạnh field, nói rõ chuyện gì sai và cách sửa; không dùng mã lỗi kỹ thuật.
- Chia form theo task và cognitive load; không máy móc biến từng field thành một page nếu việc đó làm
  flow dài hoặc mất ngữ cảnh.

Nguồn: [WCAG 3.3.8 Accessible Authentication](https://www.w3.org/WAI/WCAG22/Understanding/accessible-authentication-minimum.html),
[WCAG 3.3.7 Redundant Entry](https://www.w3.org/WAI/WCAG22/Understanding/redundant-entry.html).

### 7. Lỗi phải dễ hiểu, khôi phục được và không tạo áp lực thời gian

- Destructive action cần hậu quả cụ thể: tên người/cây bị ảnh hưởng, dữ liệu nào sẽ mất, có khôi phục
  được không.
- Dùng Undo cho action reversible; confirmation cho action không reversible hoặc ảnh hưởng quyền/
  privacy. Hai cơ chế có thể bổ sung nhau, không thay thế tuyệt đối.
- Không dùng toast biến mất nhanh cho thông tin quan trọng; người dùng phải đủ thời gian đọc.
- Session timeout vì bảo mật phải cảnh báo sớm, cho gia hạn và bảo toàn draft khi có thể.
- Không cố tình thêm độ trễ 1 giây vào nút. Cách chống bấm nhầm đúng hơn là target/spacing, wording,
  confirmation và undo.

### 8. Plain language phải phù hợp ngữ cảnh gia đình Việt Nam

- Dùng động từ cụ thể: "Thêm người thân", "Sửa thông tin", "Mời người chỉ được xem".
- Tránh jargon như node, edge, asserted, derived, capability, collaborator trong UI chính.
- Thuật ngữ nghiệp vụ bắt buộc nên có giải thích ngắn và ví dụ đời thường ngay tại chỗ.
- Cách xưng hô Bắc/Trung/Nam cần người bản địa review; không tự động suy luận vùng từ vài từ người
  dùng gõ nếu chưa có bằng chứng và consent.
- Copy cần thử với người dùng thật; readability score tiếng Anh không thay thế nghiên cứu tiếng Việt.

Nguồn: [NHS writing guidance](https://service-manual.nhs.uk/content/how-we-write),
[W3C COGA](https://www.w3.org/TR/coga-usable/).

### 9. Trust và privacy phải xuất hiện trước khi người dùng hành động

- Trước khi mời người khác, nói bằng câu ngắn họ có thể **xem gì, sửa gì, không thể làm gì**.
- Không dùng "Nhờ con cháu nhập hộ" như một đường tắt cấp quyền rộng. Tận dụng role/capability hiện
  có và trình bày quyền bằng ngôn ngữ dễ hiểu.
- Cho xem lại thay đổi trước khi lưu các quan hệ quan trọng.
- Không dùng dữ liệu gia đình thật trong usability test, prototype, screenshot hoặc research notes.

### 10. Preference nên được nhớ, nhưng default vẫn phải dễ dùng

- Lưu text size, theme và region theo contract hiện có; không bắt chọn lại qua mỗi phiên.
- Default phải sử dụng được mà không cần người thân cấu hình trước.
- Simplified mode hoặc density preference có thể được nghiên cứu như personalization tùy chọn.
- Không tạo hai sản phẩm bị lệch tính năng hoặc gắn nhãn kỳ thị "chế độ người già".

## Help/onboarding: giữ source of truth, đổi cách phân phối

Requirement 17 yêu cầu Help entry point và topic coverage, vì vậy **không xóa trang Help**. Mô hình
nên được nghiên cứu là:

1. **Lớp 1 — task entry:** empty state nói rõ một việc tiếp theo và một CTA chính.
2. **Lớp 2 — inline explanation:** một câu ngắn cạnh control/thuật ngữ đúng lúc người dùng cần.
3. **Lớp 3 — contextual topic:** mở đúng excerpt của canonical help topic, không copy nội dung sang
   component rồi để drift.
4. **Lớp 4 — task checklist:** tối đa 3–5 bước, cho phép đóng và mở lại, không chặn flow.
5. **Lớp 5 — Help hub:** task-oriented, searchable, có ví dụ/ảnh minh họa và vẫn phủ đủ các topic
   đường liền/đứt, thêm quan hệ, cách xưng hô, viewpoint, claim và region.
6. **Lớp 6 — human/proxy support:** support hoặc mời collaborator bằng role an toàn khi người dùng
   chủ động chọn.

Không dùng forced tour nhiều bước, tooltip chỉ hiện một lần, CTA nhấp nháy hoặc Help phụ thuộc hover.
Animation không cần thiết phải tắt theo `prefers-reduced-motion`.

## Sơ đồ cây trên mobile: giả thuyết cần kiểm chứng

Các điểm dưới đây là research hypotheses, chưa phải quyết định thiết kế:

- **H1 — Person-centric first:** khi mở mobile, tập trung vào một người và quan hệ gần nhất giúp hoàn
  thành tác vụ nhanh hơn việc luôn thấy toàn canvas.
- **H2 — Alternative list:** list/search view giúp tìm, chọn và sửa người thân chính xác hơn graph-only.
- **H3 — Explicit relationship action:** flow "Thêm người thân" với lựa chọn quan hệ bằng chữ giảm lỗi
  hơn drag node/vẽ edge.
- **H4 — Persistent context:** tiêu đề "Đang xem quan hệ từ [Tên]" và action "Đổi người làm góc nhìn"
  giảm nhầm lẫn hơn thuật ngữ "viewpoint" đứng độc lập.
- **H5 — Direct legend:** legend luôn có thể mở từ mobile và dùng chữ + line style, không chỉ màu,
  giúp hiểu derived/asserted/non-bloodline tốt hơn.
- **H6 — Safe recovery:** preview + undo/confirmation giảm nỗi sợ bấm sai và tăng completion độc lập.

## Benchmark và bài học chuyển giao

| Sản phẩm/nguồn | Bằng chứng có thể tin | Bài học có thể chuyển giao | Không nên suy diễn |
|---|---|---|---|
| [Apple Assistive Access](https://support.apple.com/guide/assistive-access-iphone/welcome/ios) | UI tập trung hơn, tính năng giản lược, grid/list lớn, visual alternatives, trusted supporter có thể cấu hình | Ít lựa chọn, bố cục có thể cá nhân hóa, ảnh + chữ, hỗ trợ người thân theo quyền rõ | Không chứng minh mọi user 60+ cần một mode riêng hoặc mọi nút phải ở một vị trí cố định |
| [Samsung Easy Mode](https://www.samsung.com/au/support/mobile-devices/using-easy-mode/) | Khi bật mode, screen/font tăng; có magnifier và contacts page | Target lớn, giảm density, shortcut người thân quen thuộc | Không có bằng chứng để thêm delay 1–1.5 giây cho click web hoặc giới hạn UI thành đúng 3 trang |
| [GOV.UK forms](https://www.gov.uk/service-manual/design/form-structure) | Group theo topic, hỏi theo thứ tự tự nhiên, cân nhắc one thing per page | Wizard có progress/context cho task khó; giữ câu hỏi rõ và state bền | Không buộc mọi form hoặc field thành một route riêng |
| [NHS digital service guidance](https://service-manual.nhs.uk/accessibility/user-research) | Inclusive research và accessible/plain content là phần của delivery | Viết để hiểu, test với disabled/older users, không dựa vào automated audit | Không dùng English reading age làm acceptance criterion tiếng Việt |
| [Controlled study: 3 healthcare UIs](https://pmc.ncbi.nlm.nih.gov/articles/PMC10034616/) | So sánh acceptability của các UI với older adults/caregivers | Cần prototype alternatives và test, không đoán một layout phù hợp tất cả | Kết quả health app không tự động áp dụng cho family tree |
| [Barclays accessibility](https://www.barclays.co.uk/accessibility/) và case studies | Accessibility support là một phần của trust trong domain rủi ro cao | Preferences, human support, giải thích bảo mật rõ | Claim về cloud accessibility profile trong báo cáo Gemini chưa đủ nguồn để dùng làm requirement |

GrandPad và nghiên cứu redesign Chunyu Doctor chỉ nên dùng làm nguồn ý tưởng định hướng. Nguồn hiện
có chưa đủ mạnh để đưa các chi tiết UI của chúng thành acceptance criteria.

## Anti-pattern cần tránh

- Core action chỉ có icon, swipe, long-press hoặc drag.
- Hamburger/drawer chứa toàn bộ đường vào tác vụ chính.
- Toàn bộ graph nhỏ li ti là điểm vào mặc định duy nhất trên màn hình 320–430 px.
- Form dài, field dày, error ở đầu/cuối trang hoặc xóa dữ liệu đã nhập đúng.
- Modal xuất hiện bất ngờ, che navigation hoặc không có lối thoát rõ.
- Toast quan trọng biến mất trước khi người dùng đọc xong.
- Copy kỹ thuật, hành chính hoặc dùng thuật ngữ domain mà không giải thích.
- Forced onboarding tour, Help chỉ là bài viết dài, hint không thể mở lại.
- CTA nhấp nháy để thu hút chú ý; đặc biệt không phù hợp reduced motion/cognitive accessibility.
- Cấp quyền chỉnh sửa rộng chỉ để "nhờ nhập hộ" mà không giải thích và kiểm soát role.
- Tạo một "Senior mode" bị thiếu tính năng hoặc drift khỏi UI chính.

## Đề xuất nghiên cứu người dùng tiếp theo

Đây là đề xuất research, không phải implementation plan.

### Mẫu

- Hai vòng, mỗi vòng 6–8 người; vòng sau kiểm chứng các thay đổi từ vòng trước.
- Có nhóm 60–69 và 70+, mức tự tin công nghệ thấp và trung bình, iOS/Android, Bắc/Trung/Nam.
- Không bắt buộc người tham gia phải có suy giảm thị lực/vận động; ghi nhận nhu cầu tiếp cận thay vì
  dùng nó làm điều kiện loại trừ.
- Test trên điện thoại và trình duyệt họ thường dùng khi có thể.
- Session cốt lõi thực hiện một mình; helper/caregiver dyad là một nghiên cứu riêng để không làm nhiễu
  khả năng hoàn thành độc lập.

### Tác vụ

1. Đăng nhập bằng Google hoặc email/password hiện có.
2. Tạo cây và thêm bản thân/người đầu tiên.
3. Thêm một người thân với quan hệ cụ thể.
4. Tìm một người và xem cách xưng hô từ góc nhìn hiện tại.
5. Đổi góc nhìn và chọn region.
6. Nhận biết loại đường quan hệ qua legend/help.
7. Sửa một thông tin nhập sai.
8. Mời một người chỉ được xem hoặc cộng tác, rồi giải thích lại quyền họ vừa cấp.
9. Khôi phục sau một thao tác nhầm bằng cơ chế prototype cung cấp.

Dùng dữ liệu hư cấu; không yêu cầu nhập thông tin gia đình thật.

### Chỉ số

- Unassisted completion và assisted completion báo cáo riêng; không gộp bằng công thức trọng số.
- Critical error, recoverable error, mis-tap, backtrack và số lần mở Help.
- Time on task dùng để so sánh trong cùng tác vụ, không dùng một threshold chung cho mọi người.
- Số lần hỏi "bấm đâu", dừng lâu hoặc bỏ cuộc.
- SEQ/confidence sau từng tác vụ và câu hỏi định tính "điểm nào làm bác/chú/cô lo bấm sai?".
- Quan sát có hiểu đúng permission, region, viewpoint và relationship line hay không.

### Điều phối và an toàn

- Nói rõ đang test sản phẩm, không test năng lực người tham gia.
- Dùng neutral probes; không cứu ngay sau một khoảng thời gian cứng như 10 giây.
- Cho nghỉ và dừng ngay khi người tham gia yêu cầu hoặc có dấu hiệu mệt/căng thẳng.
- Không quay/ghi âm hoặc lưu personal/family data nếu chưa có informed consent phù hợp.

## Source map được giữ lại cho Plan mode

### Chuẩn và guidance chính thống

- [W3C — Older Users and Web Accessibility](https://www.w3.org/WAI/older-users/)
- [W3C — Developing Websites for Older People](https://www.w3.org/WAI/older-users/developing/)
- [W3C — COGA: Making Content Usable](https://www.w3.org/TR/coga-usable/)
- [W3C — Target Size Minimum](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html)
- [W3C — Target Size Enhanced](https://www.w3.org/WAI/WCAG22/Understanding/target-size-enhanced.html)
- [W3C — Dragging Movements](https://www.w3.org/WAI/WCAG22/Understanding/dragging-movements.html)
- [W3C — Accessible Authentication](https://www.w3.org/WAI/WCAG22/Understanding/accessible-authentication-minimum.html)
- [W3C — Redundant Entry](https://www.w3.org/WAI/WCAG22/Understanding/redundant-entry.html)
- [Apple — Assistive Access](https://support.apple.com/guide/assistive-access-iphone/welcome/ios)
- [Apple — Accessibility HIG](https://developer.apple.com/design/human-interface-guidelines/accessibility)
- [Android — Touch target size](https://support.google.com/accessibility/android/answer/7101858?hl=en)
- [Samsung — Easy Mode](https://www.samsung.com/au/support/mobile-devices/using-easy-mode/)
- [GOV.UK — Structuring forms](https://www.gov.uk/service-manual/design/form-structure)
- [GOV.UK Design System — Question pages](https://design-system.service.gov.uk/patterns/question-pages/)
- [NHS — How we write](https://service-manual.nhs.uk/content/how-we-write)
- [NHS — Inclusive user research](https://service-manual.nhs.uk/accessibility/user-research)

### Nghiên cứu và systematic reviews

- [Design Guidelines of Mobile Apps for Older Adults: systematic review](https://pmc.ncbi.nlm.nih.gov/articles/PMC10557006/)
- [Optimizing mobile app design for older adults: systematic review](https://pmc.ncbi.nlm.nih.gov/articles/PMC12350549/)
- [Acceptability of a health app with three user interfaces](https://pmc.ncbi.nlm.nih.gov/articles/PMC10034616/)
- [Older adults' ICT use and support services](https://pmc.ncbi.nlm.nih.gov/articles/PMC10150999/)
- [Digital literacy barriers for older adults: scoping review](https://aging.jmir.org/2026/1/e80647/)
- [Older adults' mobile navigation challenges, HCI International 2019](https://www.researchgate.net/publication/333588206_Older_adults'_use_of_mobile_device_usability_challenges_while_navigating_various_interfaces)

## Handoff sang Plan mode

Research phase này đã đủ để bắt đầu Plan mode, nhưng plan không nên mặc định là redesign toàn hệ
thống. Plan cần xác định cách thu thập hoặc sử dụng các input sau trước khi khóa giải pháp cuối:

1. Baseline task funnel theo mobile từ tracking hiện có: drop-off, error, Help open và device/browser.
2. Vòng moderated testing đầu tiên với 5–8 người hoặc bằng chứng thay thế có chất lượng tương đương.
3. Chọn 2–3 flow có tác động cao để ideate/test trước, thay vì thay toàn bộ visual system.
4. Xác nhận các invariant không được phá: privacy/redaction, capability-driven UI, Help topic coverage,
   prototype sync, 44/48 target, 200% text, dark mode và reduced motion.

Research này không thay thế audit UI hiện tại; nó cung cấp rules và giả thuyết để audit và lập kế
hoạch tiếp theo.
