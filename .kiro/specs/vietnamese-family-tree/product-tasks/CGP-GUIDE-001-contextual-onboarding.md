# CGP-GUIDE-001: Hợp nhất onboarding theo ngữ cảnh và Help

## Metadata

- Type: Improvement
- Priority: P1
- Status: Approved for implementation
- Suggested capability after design approval: Heavy/Mixed
- Design requirement: Required
- Design rationale: Thay đổi tác động trực tiếp đến user journey, information hierarchy,
  contextual interaction, responsive behavior, accessibility và cách nội dung được tái sử dụng
  giữa nhiều bề mặt. Engineering không được tự quyết các hành vi này.
- Product owner: PO/BA
- Primary design owner: UI/UX Designer

## Executive summary

CayGiaPha hiện có ba lớp hướng dẫn độc lập: modal giới thiệu ở danh sách cây, tour thao tác trong
workspace và trang Help. Mỗi lớp đang sở hữu nội dung riêng, dẫn đến trùng lặp, coverage không đều,
khó cập nhật và có nguy cơ mô tả khác active Next.js runtime.

Task này xây dựng một nền tảng hướng dẫn thống nhất theo hướng **onboarding theo ngữ cảnh**:

1. Checklist khởi đầu giúp người mới đạt giá trị đầu tiên.
2. Contextual guidance xuất hiện đúng lúc, sát hành động.
3. Help là nguồn nội dung chuẩn duy nhất và nơi cung cấp hướng dẫn đầy đủ.
4. Onboarding tổng quan chỉ định hướng, không cố dạy toàn bộ sản phẩm.

Mọi lớp hướng dẫn phải không chặn người dùng, có thể bỏ qua và xem lại, phù hợp với người ít rành
công nghệ và không quảng bá tính năng chưa hoạt động end-to-end.

## Problem

Người mới phải hiểu nhiều khái niệm cùng lúc: cây, thành viên, quan hệ nguyên thủy, nét liền/nét
đứt, điểm nhìn, xưng hô vùng miền, quyền riêng tư và cộng tác. Cách hướng dẫn hiện tại phân tán nên
người dùng có thể:

- Nhận quá nhiều thông tin trước khi có nhu cầu sử dụng.
- Gặp lại cùng một nội dung ở nhiều lớp nhưng với cách diễn đạt khác nhau.
- Không biết bước nào cần làm tiếp để cây bắt đầu có giá trị.
- Không tìm lại được hướng dẫn sau khi bỏ qua.
- Đọc hướng dẫn chứa thuật ngữ kỹ thuật hoặc claim không còn đúng runtime.
- Gặp khó khăn trên mobile, khi tăng cỡ chữ hoặc khi dùng bàn phím/screen reader.

Đối với product team, việc hard-code nội dung riêng trong từng component làm tăng design/content
debt: mỗi tính năng mới cần cập nhật nhiều nơi và không có coverage map để xác nhận Help đã phản ánh
đúng sản phẩm.

## Target users

### Primary

- Người dùng lần đầu tạo hoặc mở cây.
- Người ít rành công nghệ, cần chỉ dẫn ngắn, rõ và có thể làm theo từng bước.
- Người lớn tuổi, cần chữ dễ đọc, mục tiêu rõ ràng và không bị ép hoàn thành tour.

### Secondary

- Người đã dùng cơ bản nhưng cần tìm lại một thao tác ít dùng.
- Chủ cây cần hiểu privacy, mời cộng tác viên và quản lý dữ liệu.
- Cộng tác viên hoặc người được mời cần hiểu quyền của mình và cách tham gia.
- Người dùng thành thạo muốn bỏ qua hướng dẫn nhanh nhưng vẫn mở lại được khi cần.

## Jobs to be done

### Người mới

- Khi bắt đầu, tôi muốn biết một vài bước quan trọng nhất để tạo cây có ý nghĩa mà không phải đọc
  toàn bộ tài liệu.
- Khi gặp một công cụ lần đầu, tôi muốn được giải thích ngay tại ngữ cảnh để có thể hành động.
- Khi cần hiểu sâu hơn, tôi muốn đi thẳng đến đúng mục Help thay vì tự tìm trong một trang dài.

### Người lớn tuổi hoặc ít rành công nghệ

- Tôi muốn hướng dẫn dùng từ quen thuộc, câu ngắn và nút rõ ràng.
- Tôi muốn tự quyết định tiếp tục, bỏ qua hoặc xem lại mà không sợ làm mất dữ liệu.
- Tôi muốn hướng dẫn vẫn đọc và thao tác được khi phóng to chữ hoặc dùng điện thoại.

### Người đã thành thạo

- Tôi muốn đóng hướng dẫn ngay và không bị lặp lại vô lý.
- Tôi muốn tra cứu chính xác một tính năng hiếm dùng mà không phải chạy lại toàn bộ tour.
- Khi sản phẩm có tính năng mới, tôi chỉ muốn thấy hướng dẫn liên quan đến thay đổi đó.

## Evidence

### Internal observations

- `OnboardingModal` định nghĩa mảng bước và copy riêng trong component.
- `TreeWorkspaceTour` có cấu trúc bước, selector và storage key riêng.
- `HELP_TOPICS` là một tập nội dung tĩnh khác, không được hai lớp onboarding sử dụng làm nguồn.
- Help hiện dùng các thuật ngữ như `Derived_Relationship`, `Asserted_Relationship`,
  `Kinship_Resolver`, `Form_Of_Address` và `birth order` trong nội dung hướng tới người dùng.
- Help có nguy cơ drift: nội dung cộng tác nói chủ cây có thể xóa quyền dù UI hiện tại chưa cung cấp
  đầy đủ flow đó; nội dung mã mời dễ trộn lẫn node-claim code và collaboration invitation code.
- Onboarding modal quảng bá sự kiện/ngày quan trọng nhưng eligibility của từng event flow cần được
  kiểm tra lại với active runtime trước khi dùng làm onboarding promise.
- Requirement 17 chỉ bảo đảm Help có các chủ đề cốt lõi; chưa định nghĩa kiến trúc dùng chung với
  onboarding/checklist/contextual guidance.
- Requirement 18 yêu cầu text scaling 100–200%, touch target tối thiểu 44×44, keyboard navigation
  và programmatic name/role/value cho toàn bộ controls.

### Facts

- Active runtime là Next.js full-stack; Spring Boot là reference implementation.
- Password và Google là auth flow active. OTP-only sign-up/sign-in là legacy.
- Password recovery chưa hoàn chỉnh end-to-end trên active Next.js runtime.
- Prototype phải dùng mock data và được đồng bộ khi UI/UX của trang chính thay đổi.

### Inferences

- Không có single source of truth khiến chi phí cập nhật nội dung tăng theo số bề mặt và số tính
  năng.
- Tour tuyến tính dài không phù hợp làm công cụ chính cho cả người mới lẫn người quay lại.
- Người ít rành công nghệ sẽ hưởng lợi hơn từ một checklist nhỏ và hướng dẫn đúng ngữ cảnh so với
  việc xem trước toàn bộ tính năng.

### Hypotheses

- Checklist theo trạng thái sẽ tăng tỷ lệ người dùng hoàn thành các hành động tạo giá trị đầu tiên.
- Deep link từ contextual guidance sang đúng Help topic sẽ giảm việc bỏ cuộc khi gặp thao tác lạ.
- Copy tiếng Việt đời thường sẽ cải thiện task success của người lớn tuổi so với copy dùng jargon.

### Unknowns

- Chưa có baseline định lượng về completion, skip, reopen hoặc Help success.
- Chưa có usability evidence phân tách theo độ tuổi/kỹ năng công nghệ.
- Chưa xác nhận event/reminder và node-claim flow nào đủ ổn định để đưa vào nội dung chuẩn ở phase
  đầu.

## Desired outcome

- Người mới luôn biết bước hữu ích tiếp theo nhưng không bị chặn bởi hướng dẫn.
- Người dùng có thể bỏ qua và mở lại mọi lớp hướng dẫn.
- Mỗi hướng dẫn ngắn có đường dẫn đến một Help topic chuẩn để đọc sâu hơn.
- Help phản ánh đúng active runtime và trở thành nguồn nội dung duy nhất cho mọi lớp hướng dẫn.
- Product/design/engineering có coverage map cho biết hành trình nào được hướng dẫn ở lớp nào.
- Người thành thạo có thể sử dụng sản phẩm mà không bị tour/checklist làm phiền.

## Scope

### In scope

- Kiến trúc nội dung dùng chung, với Help là canonical source.
- Onboarding tổng quan cho lần đầu vào sản phẩm/danh sách cây.
- Checklist khởi đầu, có tiến độ dựa trên trạng thái thực và có thể thu gọn/bỏ qua/xem lại.
- Contextual guidance tại các bước hoặc công cụ cần giải thích đúng lúc.
- Deep link giữa checklist/contextual guidance và đúng Help topic.
- Quy tắc trigger, dismiss, persistence, reopen và versioning khi nội dung thay đổi.
- Coverage theo role, state, platform và mức độ thành thạo.
- Final Vietnamese copy và terminology map.
- Required empty/loading/error/disabled/success/permission/privacy states.
- Instrumentation taxonomy không thu thập dữ liệu gia đình.
- Đồng bộ prototype và yêu cầu verification trực quan.

### Out of scope

- Chatbot hoặc trợ lý hội thoại.
- Video tutorial.
- CMS hoặc trang quản trị nội dung.
- Đa ngôn ngữ.
- Redesign toàn bộ auth.
- Redesign toàn bộ graph/workspace, Help hoặc navigation.
- Gamification, badge hoặc điểm thưởng.
- Quảng bá roadmap-only capabilities.
- Thay đổi business rule, permission, privacy, kinship hoặc API của tính năng được hướng dẫn.
- Tự động thao tác thay người dùng.

## Journey catalogue

Designer phải lập coverage matrix cho các hành trình sau. Không phải mọi hành trình đều cần xuất
hiện trong checklist; lớp hướng dẫn được chọn theo nguyên tắc ở phần tiếp theo.

### Khởi đầu và tạo giá trị đầu tiên

1. Đăng nhập/đăng ký bằng active auth method và đi vào sản phẩm.
2. Hiểu danh sách cây và tạo/mở cây đầu tiên.
3. Tạo thành viên đầu tiên.
4. Thêm cha, mẹ, vợ/chồng hoặc con bằng quan hệ nguyên thủy.
5. Mở sơ đồ, chọn một người và xem thông tin/xưng hô.
6. Chọn hoặc đổi điểm nhìn.

### Xây dựng và khám phá cây

7. Pan, zoom, focus và mở thông tin thành viên.
8. Thêm/chỉnh sửa thành viên.
9. Thêm quan hệ nét liền hoặc nét đứt và hiểu giới hạn của mỗi loại.
10. Tìm kiếm thành viên và dùng các bộ lọc active.
11. Hiểu legend, trạng thái node và đường quan hệ.
12. Xử lý quan hệ xung đột nếu flow active được xác nhận.

### Quyền riêng tư và dữ liệu

13. Chọn vùng miền.
14. Hiểu living-person redaction và field visibility.
15. Thêm/xem/quản lý ảnh theo quyền hiện tại.
16. Xóa người với cascade hoặc neighbor preservation.
17. Phân biệt dữ liệu tài khoản với Person node/claimed node.

### Cộng tác

18. Chủ cây mời cộng tác viên và xem trạng thái lời mời.
19. Người được mời tham gia hoặc chờ phê duyệt theo flow active.
20. Phân biệt collaborator invitation với person-node claiming.
21. Hiểu quyền owner, contributor và linked claimed user.

### Trợ năng và trợ giúp

22. Mở Help từ các entry point hiện có.
23. Tìm đúng Help topic và quay lại tác vụ đang làm.
24. Điều chỉnh cỡ chữ, theme và reduced-motion expectations.
25. Bỏ qua, thu gọn, hoàn thành hoặc mở lại hướng dẫn.

### Conditional journeys

Chỉ đưa vào Help/checklist/contextual guidance sau khi PO/BA xác nhận end-to-end active:

- Event, birthday hoặc death-anniversary reminders.
- Person-node claim bằng verification code.
- Display-name editing nếu task tài khoản tên hiển thị chưa được triển khai xong.
- Bất kỳ flow nào có UI nhưng thiếu active Next.js API hoặc verification.

## Guidance-layer principles

### 1. Onboarding tổng quan

- Mục tiêu: định hướng giá trị và giúp người dùng chọn hành động đầu tiên.
- Chỉ giới thiệu một số khái niệm nền tảng; không dạy thao tác chi tiết.
- Xuất hiện có kiểm soát ở lần đầu hoặc khi user chủ động mở lại.
- Luôn có bỏ qua/đóng; đóng không làm thay đổi dữ liệu.
- Không lặp lại sau khi đã hoàn tất nếu không có version mới hoặc người dùng yêu cầu xem lại.

### 2. Checklist

- Mục tiêu: đưa người dùng đến outcome đầu tiên bằng các hành động có thể kiểm chứng.
- Tiến độ dựa trên trạng thái thực, không dựa trên việc người dùng chỉ bấm xem hướng dẫn.
- Số mục khởi đầu phải nhỏ và ưu tiên theo dependency; item nâng cao không chen vào core path.
- Có thể thu gọn, bỏ qua và mở lại.
- Không dùng áp lực, countdown, guilt copy hoặc dark pattern.
- Mỗi item có thể mở đúng tác vụ hoặc Help topic, nhưng không tự thay đổi dữ liệu.

### 3. Contextual guidance

- Mục tiêu: giải thích đúng lúc khi người dùng gặp công cụ, state hoặc quyết định khó.
- Gắn với context/role/state thực; không hiển thị lời nhắc không thể hành động.
- Ngắn, một mục tiêu mỗi lần, dismissible và không che mất hành động chính.
- Không lặp vô hạn; có recurrence/version rule rõ ràng.
- Có link `Tìm hiểu thêm` tới đúng Help topic khi cần kiến thức sâu.
- Error/permission/privacy guidance phải giải thích cách phục hồi, không đổ lỗi người dùng.

### 4. Help chi tiết

- Là canonical source duy nhất cho nội dung hướng dẫn.
- Mỗi topic phải hiểu được khi mở trực tiếp, không phụ thuộc đã xem onboarding.
- Bao gồm mục tiêu, ai có thể làm, prerequisite, từng bước, state/failure/privacy notes và liên kết
  tới topic liên quan khi cần.
- Onboarding, checklist và contextual guidance tham chiếu/reuse excerpt từ Help topic thay vì duy
  trì copy độc lập không kiểm soát.
- Topic có stable ID để deep link, instrumentation và regression test.

## Content and Vietnamese-language requirements

- Viết tiếng Việt đời thường, ưu tiên động từ và kết quả người dùng.
- Dùng sentence case; không Title Case tiếng Việt tùy tiện.
- Câu ngắn, một ý chính mỗi câu; đoạn văn ngắn và có thứ tự thao tác rõ.
- Gọi tên UI đúng copy đang hiển thị; không dùng tên class, API hoặc database.
- Không dùng `Derived_Relationship`, `Asserted_Relationship`, `Kinship_Resolver`,
  `Form_Of_Address`, `birth order` trong copy chính. Nếu thật sự cần, đặt thuật ngữ kỹ thuật sau
  cách diễn đạt đời thường và không yêu cầu người dùng ghi nhớ.
- Phân biệt rõ `điểm nhìn`, `người trong cây`, `tài khoản`, `người xác nhận nút`, `chủ cây` và
  `cộng tác viên`.
- Không dùng lời hứa tuyệt đối như “đảm bảo quyền riêng tư tối đa”. Mô tả chính xác ai thấy gì và
  setting nào kiểm soát việc đó.
- Không mô tả một control, role hoặc outcome chưa có trong active runtime.
- Ví dụ, hình minh họa và prototype phải dùng dữ liệu hư cấu, không dùng dữ liệu gia đình thật.
- Final copy phải có cả label, helper text, skip/reopen text, error/recovery và privacy disclosure.

## Feature eligibility

### Được phép xuất hiện sau khi đối chiếu đúng active UI/API

- Password/Google sign-up và sign-in; sign-out.
- Tạo, mở, đổi tên và quản lý cây theo behavior active.
- Person CRUD và primitive parent-child/spouse relationships.
- Asserted/dashed relationships nếu UI và resolver flow active được xác nhận.
- Graph navigation, selection, legend, viewpoint, address display, search/filter.
- Region setting.
- Living-person redaction, field visibility, sharing behavior và privacy notices.
- Photo flows hỗ trợ JPEG/PNG theo quyền hiện tại.
- Collaboration invitation/join/approval theo role active.
- Cascade và neighbor-preservation deletion.
- Help, text scaling, theme, keyboard navigation và reduced motion.

### Chưa được phép quảng bá

- Password recovery, cho đến khi active Next.js request/confirm handlers và E2E verification hoàn
  chỉnh.
- Push/email/Zalo reminder nếu delivery chưa active end-to-end.
- RSVP, host rotation, full event calendar nếu chưa active.
- Branch-scoped role, read-only role, change proposal/approval queue hoặc collaborator removal nếu
  UI/API chưa hỗ trợ đầy đủ.
- Import/export Excel, GEDCOM, PDF/PNG nếu chưa triển khai.
- Grave map, QR identity card, oral history, AI narrative, song ngữ, clan fund, clan announcements,
  OCR/Hán Nôm, cross-tree discovery, health tracking hoặc gamification.
- Bất kỳ roadmap claim nào không có runtime evidence và PO/BA approval.

## UX, accessibility and responsive requirements

- Mọi guidance surface dùng semantic structure, accessible name và logical heading hierarchy.
- Toàn bộ control reachable bằng keyboard, focus visible và focus order phù hợp tác vụ.
- Nếu dùng dialog/popover/tooltip, xác định role, initial focus, focus trap khi phù hợp, Escape,
  focus restoration và screen-reader announcement.
- Touch target tối thiểu 44×44 CSS px, ưu tiên 48×48.
- Nội dung reflow được ở 200% text scaling, không mất action hoặc che nội dung chính.
- Guidance không chỉ dựa vào màu, animation, vị trí hover hoặc gesture.
- `prefers-reduced-motion` tắt chuyển động không thiết yếu.
- Trên mobile, guidance không che action chính, không tạo horizontal overflow và không yêu cầu
  precision interaction.
- Trên tablet/desktop, tooltip/spotlight phải xử lý target vắng mặt, target ngoài viewport,
  sidebar collapsed và responsive relocation.
- Có fallback không-spotlight nếu geometry hoặc target không khả dụng.

## Privacy requirements

- Guidance state/telemetry không chứa tên người, email, số điện thoại, tree ID, person ID, ảnh,
  ngày sinh/ngày mất, relation label, search query, invite/claim code hoặc dữ liệu gia đình.
- Không render dữ liệu thật trong screenshot, prototype hoặc design artifact.
- Không làm guidance vô tình tiết lộ control/setting mà role hiện tại không được phép dùng.
- Privacy explanation phải phản ánh đúng owner/collaborator/claimed/read authorization và
  living-person redaction.
- Dismiss/completion state chỉ lưu dữ liệu tối thiểu cần thiết cho hướng dẫn.

## Required states

- First eligible visit.
- Returning user: incomplete checklist.
- Checklist completed.
- Checklist skipped/dismissed.
- Guidance reopened manually.
- New guidance version or newly eligible feature.
- No tree / empty tree.
- Populated tree.
- Owner, collaborator, linked user và read-only/non-editor contexts.
- Target control present, absent, disabled, outside viewport hoặc relocated by breakpoint.
- Loading, API error, offline/retry where applicable.
- Permission denied/privacy redacted.
- Desktop, tablet, mobile, keyboard-only, reduced motion và 200% text scaling.

## Acceptance criteria

### AC1 — Single content source

Given một concept được trình bày trong Help và một guidance surface,
when nội dung được thiết kế,
then Help topic là canonical source và guidance dùng reference/excerpt có traceability tới stable
topic ID, không duy trì một bản giải thích độc lập không kiểm soát.

### AC2 — Coverage architecture

Designer cung cấp coverage matrix cho toàn bộ journey catalogue, chỉ rõ lớp overview/checklist/
contextual/Help, target role, trigger, completion signal và deep link.

### AC3 — Non-blocking

Mọi onboarding/checklist/contextual surface đều có cách bỏ qua hoặc đóng; người dùng vẫn thực hiện
được tác vụ chính và có thể mở lại hướng dẫn sau đó.

### AC4 — Checklist integrity

Checklist chỉ đánh dấu hoàn thành khi active product state chứng minh outcome đã xảy ra; việc mở
item hoặc Help không được tính là hoàn thành tác vụ.

### AC5 — Context eligibility

Guidance chỉ xuất hiện khi role, state, feature availability và target control phù hợp. Target vắng
mặt không gây tooltip trôi, overlay kẹt hoặc JavaScript error.

### AC6 — Runtime accuracy

Không có copy hoặc artifact quảng bá password recovery hay roadmap-only/incomplete capability.
Mỗi topic thuộc nhóm conditional phải có runtime evidence và PO/BA approval trước khi publish.

### AC7 — Vietnamese clarity

Final copy không yêu cầu hiểu technical English; thuật ngữ UI và role được dùng nhất quán; user
testing cho thấy người mới có thể diễn giải đúng bước tiếp theo mà không cần người hỗ trợ giải thích.

### AC8 — Help completeness

Help vẫn đáp ứng Requirement 17 và mở rộng để bao phủ các core journeys được duyệt, với stable
anchors, reachable navigation và direct-link comprehension.

### AC9 — Accessibility

Guidance đáp ứng keyboard, focus, screen-reader semantics, contrast, touch target và 200% reflow;
reduced-motion không làm mất thông tin hoặc control.

### AC10 — Responsive behavior

Các state được định nghĩa tại 1280×800, 768×1024 và 375×667; không có horizontal page overflow,
action bị che hoặc guidance phụ thuộc hover-only.

### AC11 — Persistence and reopen

Design xác định rõ completed/dismissed/versioned state, recurrence rule và entry point `Xem lại
hướng dẫn`; người thành thạo không bị auto-tour lặp lại vô lý.

### AC12 — Privacy-safe measurement

Instrumentation chỉ dùng approved event taxonomy và không chứa family data/private identifiers.

### AC13 — Prototype synchronization

Design package chỉ rõ các production/prototype surfaces cần đồng bộ và state mock cần bổ sung; mọi
fixture đều hư cấu.

### AC14 — No product redesign

Thiết kế giữ nguyên core product navigation, auth architecture, graph model và business rules;
mọi đề xuất vượt non-goals phải quay lại PO/BA.

## Success metrics and measurement

Không đặt target giả trước khi có baseline. Phase đầu phải đo baseline, sau đó PO/BA chốt target.

### Primary metrics

- Tỷ lệ người dùng đủ điều kiện hoàn thành core checklist.
- Tỷ lệ đạt first-value outcomes sau khi checklist được hiển thị: tạo/mở cây, tạo người đầu tiên,
  thêm quan hệ đầu tiên và mở/xem sơ đồ.
- Task-success rate trong usability test cho người mới/người lớn tuổi.

### Secondary metrics

- Completion, skip, dismiss và reopen rate theo guidance surface.
- Tỷ lệ contextual guidance dẫn tới hành động thành công hoặc đúng Help topic.
- Help topic open → return-to-task rate.
- Tỷ lệ Help search/navigation dẫn tới đúng topic trong usability test.

### Guardrails

- Không tăng signup/tree/workspace abandonment vì guidance.
- Không tăng error rate hoặc time-to-interact của workspace.
- Không có critical accessibility violation mới.
- Người thành thạo có thể skip ngay và không bị guidance lặp lại ngoài recurrence rule.

### Privacy-safe event taxonomy

Chỉ được thu thập dữ liệu tối thiểu như:

- Event name: `guide_shown`, `guide_skipped`, `guide_completed`, `guide_reopened`,
  `guide_help_opened`, `checklist_item_completed`.
- Canonical topic/checklist ID.
- Surface, role category, device category, guidance version và coarse timestamp/app version.

Không thu thập nội dung cây, tên/email, account/tree/person ID, search query, relationship, ngày,
ảnh, code hoặc free text. Nếu hệ thống chưa có analytics phù hợp, instrumentation là dependency và
không được thay thế bằng log chứa dữ liệu người dùng.

### Measurement window

- Baseline: tối thiểu 2 tuần hoặc đủ volume do PO/BA xác nhận.
- Post-release comparison: cùng độ dài và cùng cohort eligibility.
- Usability: có người mới, người lớn tuổi/ít rành công nghệ và người thành thạo; ghi rõ sample nhỏ
  là directional evidence, không suy rộng thành market fact.

## Dependencies

- Product: feature-eligibility review với active Next.js runtime.
- Design: coverage map, content architecture, flow/state/responsive specification và final copy.
- Technical: canonical Help content model; guidance state/versioning; privacy-safe instrumentation.
- Prototype: tree list, populated/empty tree, Help và mọi guidance surface bị ảnh hưởng.
- Verification: accessibility, responsive, runtime feature coverage và content regression tests.

## Risks

- Guidance overload làm người dùng chậm hơn thay vì dễ hơn.
- Checklist trở thành gamification hoặc dark pattern.
- Contextual tooltip phụ thuộc selector dễ hỏng sau UI changes.
- Help source of truth chỉ tồn tại trên danh nghĩa nhưng component vẫn copy text riêng.
- Role/privacy mismatch làm lộ hoặc quảng bá action người dùng không có quyền.
- Content drift tiếp diễn nếu không có eligibility/version/review gate.
- Telemetry vô tình chứa family data hoặc stable private identifiers.
- Người lớn tuổi gặp khó với overlay nhỏ, motion hoặc focus behavior.

## Assumptions

- Help page tiếp tục là bề mặt chi tiết chính.
- Active UI vẫn cung cấp entry point Help.
- Local persistence có thể dùng cho non-sensitive guide state, nhưng Designer không quyết định
  implementation storage.
- Core journeys có thể được xác định bằng product state mà không cần đọc nội dung gia đình.
- Final content architecture phải hỗ trợ feature addition mà không buộc redesign toàn bộ guidance.

## Open product questions

- Event/reminder và person-node claiming có đủ ổn định để vào phase đầu hay giữ conditional?
- Core checklist nên thay đổi thế nào giữa owner, collaborator và user chưa có cây?
- Checklist completion state có cần đồng bộ đa thiết bị hay local state là đủ cho phiên bản đầu?
- Analytics infrastructure nào được phép dùng, và retention period là bao lâu?
- Có cần một content-owner/review cadence chính thức sau release không?

Các câu hỏi này phải được Designer nêu lại nếu ảnh hưởng flow. PO/BA sẽ chốt trước Approved Task
Document cho engineering; Designer không tự mở rộng product scope.

## Priority and phased delivery

### Phase 0 — Audit and eligibility foundation (P1, prerequisite)

- Inventory toàn bộ nội dung hiện tại.
- Map duplicate/contradictory/missing topics.
- Xác nhận runtime eligibility và prohibited claims.
- Định nghĩa canonical topic IDs, terminology và measurement baseline.

### Phase 1 — Core onboarding foundation (P1)

- Canonical Help architecture.
- Onboarding tổng quan gọn.
- Core first-value checklist.
- Reopen/version/persistence behavior.
- Core contextual guidance và deep links.
- Prototype, accessibility và responsive coverage.

### Phase 2 — Secondary contextual coverage (P2)

- Privacy, collaboration, photos, deletion, advanced graph/search guidance.
- Role-specific and state-specific refinements.
- Chỉ thêm conditional journeys sau runtime approval.

### Phase 3 — Evidence-based optimization (P2/P3)

- Usability iteration cho người lớn tuổi/người ít rành công nghệ.
- Điều chỉnh trigger/frequency/copy dựa trên privacy-safe metrics.
- Không mở rộng sang chatbot/video/CMS nếu không có task discovery riêng.

## Definition of Done for design phase

Design phase chỉ hoàn thành khi:

- Tất cả design deliverables bên dưới tồn tại và có artifact path/version rõ ràng.
- Coverage matrix bao phủ journey catalogue và feature eligibility.
- Required states, responsive, accessibility, privacy và copy hoàn chỉnh.
- Engineering không phải tự quyết trigger, recurrence, hierarchy, state hoặc content ownership.
- Designer trả một self-contained `DESIGN REVIEW PROMPT FOR PO/BA`.
- PO/BA kiểm tra artifact thực tế và ghi `APPROVED`, `REVISION REQUIRED` hoặc `REJECTED`.

---

# DESIGN EXECUTION PROMPT

## Role

Bạn là UI/UX Designer của CayGiaPha, chịu trách nhiệm thiết kế trải nghiệm hướng dẫn thống nhất,
contextual, accessible và implementation-usable. Bạn sở hữu cách trải nghiệm hoạt động và được tổ
chức; PO/BA sở hữu problem, scope, outcome và approval.

## Task ID and title

CGP-GUIDE-001 — Hợp nhất onboarding theo ngữ cảnh và Help.

## Product problem

CayGiaPha có ba lớp hướng dẫn độc lập — modal giới thiệu, workspace tour và Help — nhưng không dùng
chung content architecture. Nội dung bị trùng, coverage không đều, chứa jargon và có nguy cơ mô tả
khác active Next.js runtime. Người mới, người lớn tuổi và người ít rành công nghệ chưa có một đường
dẫn rõ ràng từ “vừa vào sản phẩm” tới “đã tạo được giá trị đầu tiên”, trong khi người thành thạo có
nguy cơ bị hướng dẫn lặp lại.

## Desired outcome

- Người mới biết bước hữu ích tiếp theo mà không bị chặn.
- Checklist đưa người dùng đến first-value outcomes bằng trạng thái thực.
- Contextual guidance xuất hiện đúng role/state và dẫn tới Help topic tương ứng.
- Help là canonical content source duy nhất.
- Mọi lớp hướng dẫn có thể bỏ qua và mở lại.
- Trải nghiệm usable trên mobile, tablet, desktop, keyboard và 200% text scaling.
- Không quảng bá tính năng chưa active end-to-end.

## Target users

Primary:

- Người lần đầu dùng CayGiaPha.
- Người lớn tuổi hoặc ít rành công nghệ.

Secondary:

- Người dùng quay lại cần học một thao tác cụ thể.
- Owner/collaborator cần hiểu role, privacy và cộng tác.
- Người thành thạo muốn skip nhanh nhưng vẫn có Help khi cần.

## Affected journeys

Thiết kế phải dùng journey catalogue và phased scope trong task document, tối thiểu bao phủ:

- First visit → tree list → create/open tree.
- Empty tree → first person → first primitive relationship.
- Workspace orientation → select person → viewpoint/address.
- Search, graph navigation và legend.
- Region, privacy/redaction và field visibility.
- Collaboration invitation/join theo active role.
- Help discovery, direct topic access và return-to-task.
- Skip, dismiss, complete, reopen và content-version update.

## Affected surfaces

- `/tree` và trạng thái không có cây/có cây.
- `/tree/[id]` populated và empty workspace.
- Existing onboarding modal.
- Existing workspace tour.
- Checklist surface do Designer đề xuất trong information hierarchy hiện có.
- Contextual guidance gắn với active controls/states.
- `/help` và Help navigation/topic structure.
- Existing Help entry points.
- Prototype equivalents: tree, tree/empty, Help và các state liên quan.

Không redesign toàn bộ navigation, graph hoặc auth.

## Product constraints

### Scope

- Checklist + contextual guidance + canonical Help architecture.
- Không chỉ sửa copy; phải giải quyết trigger, hierarchy, state, reuse và reopen.

### Active-runtime truth

- Next.js full-stack là active runtime.
- Password/Google là active auth.
- Password recovery chưa được phép quảng bá.
- Chỉ đưa feature vào guidance khi có active UI/API evidence và được PO/BA cho phép.
- Dùng feature eligibility section trong task document làm gate.

### Privacy/security

- Không dùng dữ liệu gia đình thật trong artifact.
- Không thu thập hoặc thiết kế telemetry chứa names, emails, IDs, dates, relations, photos,
  searches hoặc codes.
- Guidance phải role-aware và không lộ action/setting không được phép.

### Kinship/regional behavior

- Không thay đổi graph/kinship rules.
- Copy phân biệt nét liền/nét đứt bằng tiếng Việt dễ hiểu.
- Region Bắc/Trung/Nam là setting ảnh hưởng cách xưng hô, không phải language selector.

### Language/copy

- Tiếng Việt đời thường, câu ngắn, sentence case.
- Tránh technical English trong copy chính.
- Final copy phải gồm labels, helper, skip/reopen, errors, recovery và privacy notices.

### Accessibility

- Keyboard/focus/screen-reader semantics.
- 44×44 minimum targets, ưu tiên 48×48.
- 200% text reflow.
- Reduced motion.
- Không dựa vào color/hover/gesture duy nhất.

### Technical constraints đã xác nhận

- Dùng standard `<img>`, không dùng `next/image`.
- Prototype phải được đồng bộ cùng production UI.
- Prototype chỉ dùng mock data.
- Không chỉ định framework rewrite hoặc CMS.
- Thiết kế phải chịu được target control absent/relocated và sidebar collapsed.

## Existing repository context to inspect

Đọc đầy đủ:

- `AGENTS.md`
- `.agents/memory.md` — chỉ các entry liên quan onboarding/help/prototype/active runtime
- `.agents/product-delivery-workflow.md`
- `.kiro/specs/vietnamese-family-tree/requirements.md` — đặc biệt Requirement 17 và 18
- `.kiro/specs/vietnamese-family-tree/design.md` — Help_System, accessibility, privacy/auth baseline
- `.kiro/specs/vietnamese-family-tree/tasks.md` — Help và known active-runtime gaps
- `frontend/docs/ui/INDEX.md`
- `frontend/docs/ui/README.md`
- `frontend/docs/ui/AUDIT.md` — chỉ historical findings liên quan
- Task document này.

Inspect actual artifacts/surfaces:

- `OnboardingModal`
- `TreeWorkspaceTour`
- `HELP_TOPICS`, `HelpGuide`, `HelpNav`, `HelpSection`, `HelpEntryPoint`
- `/tree`, `/tree/[id]`, `/help`
- `/prototype/tree`, `/prototype/tree/empty`, `/prototype/help`
- Existing onboarding/tour/help tests.

Dùng CodeGraph cho structural inspection. Không dựa chỉ vào summary trong prompt.

## Required states and platforms

### States

- First eligible visit.
- Returning user with incomplete checklist.
- Completed checklist.
- Skipped/dismissed and manually reopened.
- New guide version/new eligible feature.
- No tree, empty tree, populated tree.
- Owner, collaborator, linked user, non-editor/read contexts.
- Target present, absent, disabled, offscreen hoặc relocated.
- Loading, error, retry/offline where applicable.
- Permission denied/privacy-redacted.
- Help direct link and return-to-task.

### Desktop

- Reference viewport: 1280×800.
- Cover full workspace, collapsed/expanded navigation and target positioning.

### Tablet

- Reference viewport: 768×1024.
- Cover re-composed toolbar/navigation and touch behavior.

### Mobile

- Reference viewport: 375×667.
- No horizontal overflow, obscured primary action or hover-only behavior.
- Guidance must remain dismissible and readable at 200% text scaling.

## Required design deliverables

1. Current-state content inventory and contradiction/duplication audit.
2. Guidance architecture showing relationship between overview, checklist, contextual guidance
   and Help.
3. Canonical Help content model with stable topic IDs, excerpt/reference rules and content-owner
   expectations.
4. Journey × guidance-layer × role/state coverage matrix.
5. First-value checklist definition, item order, completion signals, skip/reopen/version behavior.
6. Contextual guidance trigger/frequency/dismiss/recovery specification.
7. User-flow specification for first visit, returning visit, skip, completion, reopen and Help
   deep links.
8. Information hierarchy and screen/component specification without redesigning unrelated product
   surfaces.
9. State matrix covering every required state.
10. Responsive rules for desktop/tablet/mobile and target-relocation fallback.
11. Accessibility specification: semantics, focus, keyboard, announcements, touch, scaling and
    reduced motion.
12. Privacy-safe instrumentation event taxonomy and prohibited payload list.
13. Final Vietnamese copy and terminology map.
14. Existing patterns reused; proposed new patterns and rationale.
15. Alternatives considered and tradeoffs.
16. Annotated visual artifacts/mockups at readable, section-specific sizes.
17. Prototype synchronization map and required mock states.
18. Implementation-relevant measurements/tokens/assets where necessary.

## Design acceptance criteria

- Help is demonstrably the canonical source; every excerpt can be traced to a stable topic ID.
- Coverage matrix includes all journeys and explicitly excludes/conditions inactive features.
- Core checklist uses real completion signals and is non-blocking.
- Trigger, recurrence, dismiss, reopen and version behavior require no engineering guesswork.
- Contextual guidance handles missing/disabled/relocated targets without broken overlays.
- Final copy is understandable without technical English.
- Owner/collaborator/privacy differences are accurate.
- All desktop/tablet/mobile and accessibility states are specified.
- Password recovery and roadmap-only capabilities do not appear as available.
- Prototype sync and privacy-safe measurement are fully specified.
- Scope does not expand into chatbot, video, CMS, multi-language or broad auth redesign.

## Non-goals

- Do not design chatbot, video guidance, CMS or multilingual content.
- Do not redesign auth, navigation, graph or the whole Help visual language.
- Do not add gamification.
- Do not redefine product permissions or domain behavior.
- Do not produce engineering decomposition or assign implementation Workers.

## Handoff requirement

Sau khi hoàn thành, trả một self-contained:

`DESIGN REVIEW PROMPT FOR PO/BA`

Prompt phải chứa:

- Original product problem và desired outcome.
- Artifact paths/links và version/status.
- Current-state findings.
- Proposed user flows.
- Guidance architecture và canonical content model.
- Checklist items và completion logic.
- Contextual trigger/recurrence/reopen decisions.
- Coverage matrix summary.
- State/responsive coverage.
- Accessibility/privacy coverage.
- Final Vietnamese copy location.
- Existing/new patterns và rationale.
- Alternatives considered.
- Assumptions.
- Open product questions.
- Explicit feature eligibility/exclusion check.
- Prototype synchronization requirements.
- Các mục PO/BA phải review.

Không chỉ gửi summary hoặc link thiết kế. PO/BA sẽ mở và kiểm tra artifact thực tế trước khi
APPROVE hoặc gửi DESIGN REVISION PROMPT.
