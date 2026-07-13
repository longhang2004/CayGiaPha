-- Canonical early-access legal v2 snapshot. Keep this content synchronized with
-- frontend/src/content/legal/legalContent.ts.
INSERT INTO legal_documents (doc_type, version, body, published_at) VALUES
(
  'tos',
  2,
  $tos$# Điều khoản dịch vụ

Phiên bản 2 — Ngày 13 tháng 7 năm 2026

Bản truy cập sớm — nội dung này mô tả cơ chế hiện tại và vẫn cần được chuyên gia pháp lý rà soát.

## 1. Phạm vi dịch vụ và tài khoản

Cây Gia Phả là dịch vụ truy cập sớm giúp tạo hoặc tham gia nhiều cây gia phả, lưu thông tin và ảnh, cộng tác với người thân và tính cách xưng hô tiếng Việt theo vùng Bắc, Trung, Nam.

Tài khoản mới đăng ký bằng email và mật khẩu hoặc Google. Tài khoản số điện thoại đã có từ trước có thể tiếp tục đăng nhập và khôi phục mật khẩu khi nhà cung cấp SMS khả dụng.

## 2. Vai trò và quyền trong cây

Owner quản lý toàn bộ cây, quyền riêng tư, chia sẻ, lời mời và cộng tác viên. Contributor được xem đầy đủ và biên tập người, quan hệ, ảnh nhưng không đổi quyền riêng tư hay cấu hình cây. Linked chỉ quản lý node và ảnh của mình; Reader chỉ xem dữ liệu đã được chiếu theo quyền riêng tư.

Bạn phải bảo vệ thông tin đăng nhập, mã xác nhận và chỉ cấp quyền phù hợp cho người mà bạn tin cậy.

## 3. Nội dung gia phả và trách nhiệm

Người nhập dữ liệu chịu trách nhiệm về tính chính xác, cơ sở phù hợp và quyền sử dụng thông tin hoặc ảnh của người khác. Không được giả mạo danh tính, đăng nội dung trái pháp luật, gây hại, xâm phạm quyền riêng tư hoặc cố ý làm quá tải dịch vụ.

Tính năng “Xác nhận đây là tôi” chỉ liên kết một hồ sơ khi mã mời khớp với danh tính của tài khoản đang đăng nhập.

## 4. Chia sẻ và quyền riêng tư

Mỗi cây có chế độ private, link hoặc public. Dữ liệu hiển thị còn phụ thuộc vai trò, lựa chọn ẩn người còn sống và mức public/private của từng trường; link chia sẻ hoặc vai trò Reader không tự động cấp quyền biên tập.

## 5. Giai đoạn truy cập sớm

Các tính năng hiện có được mở miễn phí trong giai đoạn truy cập sớm. Dịch vụ có thể thay đổi, gián đoạn, còn lỗi hoặc thiếu sót; chúng tôi sẽ nỗ lực bảo vệ dữ liệu và cải thiện hệ thống nhưng không cam kết dịch vụ luôn không có lỗi.

## 6. Thay đổi và liên hệ

Khi nội dung pháp lý thay đổi đáng kể, hệ thống có thể yêu cầu bạn chấp thuận phiên bản mới trước khi tiếp tục thay đổi dữ liệu. Bạn có thể gửi câu hỏi hoặc phản hồi tại /feedback.$tos$,
  TIMESTAMPTZ '2026-07-13T00:00:00Z'
),
(
  'privacy',
  2,
  $privacy$# Chính sách quyền riêng tư

Phiên bản 2 — Ngày 13 tháng 7 năm 2026

Bản truy cập sớm — nội dung này mô tả cơ chế hiện tại và vẫn cần được chuyên gia pháp lý rà soát.

## 1. Dữ liệu được xử lý

Dữ liệu tài khoản có thể gồm email, tên hiển thị, thông tin đăng nhập Google, mật khẩu đã băm và số điện thoại của tài khoản legacy. Hệ thống không lưu mã OTP hoặc session token ở dạng rõ.

- Dữ liệu gia phả: tên, giới tính, thứ tự sinh, năm sinh, ngày mất, liên hệ, quan hệ và lựa chọn quyền riêng tư.
- Ảnh kỷ niệm và metadata cần thiết để lưu, hiển thị, đặt ảnh đại diện hoặc xóa ảnh.
- Lời mời, claim, cộng tác, consent, nhật ký bảo mật, phản hồi và thông tin kỹ thuật cần cho vận hành.

## 2. Mục đích sử dụng

Dữ liệu được dùng để vận hành tài khoản và nhiều cây, dựng sơ đồ, tính xưng hô, tìm kiếm, hiển thị sự kiện gia đình, lưu ảnh, gửi lời mời hoặc mã bảo mật, chống lạm dụng, hỗ trợ và cải thiện dịch vụ.

## 3. Ai có thể xem dữ liệu

Owner và Contributor là người đọc tin cậy trong cây. Linked xem đầy đủ node của mình nhưng chỉ nhận dữ liệu đã chiếu ở node khác. Reader chỉ nhận dữ liệu public sau khi áp dụng bảo vệ người còn sống và quyền riêng tư từng trường.

Chế độ private giới hạn cho Owner, Contributor và Linked; link yêu cầu token hợp lệ; public cho phép tài khoản đã đăng nhập đọc dữ liệu đã chiếu. Ảnh và trường private không được mở chỉ vì cây dùng link hoặc public.

## 4. Lưu trữ và bảo vệ

Mã xác nhận được băm, dùng một lần và có thời hạn; session có thể bị thu hồi. Ảnh được lưu ở storage cấu hình cho hệ thống. Dữ liệu được giữ trong thời gian tài khoản hoặc cây còn hoạt động, trừ khi cần giữ tối thiểu cho bảo mật, giải quyết sự cố hoặc nghĩa vụ pháp lý.

## 5. Quyền dữ liệu

Người dùng đã liên kết hồ sơ có thể xem, xuất, sửa, xóa hoặc ẩn danh dữ liệu của node mình theo các lựa chọn được cung cấp. Xóa tài khoản xử lý mọi cây do tài khoản sở hữu, gỡ quyền cộng tác, claim và session; cây chỉ tham gia với tư cách Contributor không bị xóa.

## 6. Nhà cung cấp và liên hệ

Hệ thống có thể sử dụng nhà cung cấp hạ tầng, email, SMS, Google đăng nhập hoặc lưu trữ ảnh chỉ trong phạm vi cần thiết để cung cấp dịch vụ. Không bán dữ liệu gia phả cho mục đích quảng cáo.

Gửi yêu cầu quyền dữ liệu, câu hỏi hoặc phản hồi qua /feedback. Không gửi mật khẩu, OTP, session token hoặc dữ liệu gia đình nhạy cảm không cần thiết trong nội dung phản hồi.$privacy$,
  TIMESTAMPTZ '2026-07-13T00:00:00Z'
)
ON CONFLICT (doc_type, version) DO NOTHING;
