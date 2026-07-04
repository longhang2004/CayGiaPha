---
name: prototype-ui-audit
description: Tự động chạy Playwright chụp màn hình toàn bộ UI ở 3 thiết bị (Desktop, Tablet, Mobile) và phân tích các lỗi giao diện/cải thiện.
---

# Prototype UI Audit Skill

Skill này cung cấp quy trình để các Agent thực hiện kiểm tra (audit) giao diện của hệ thống thông qua các prototype pages một cách toàn diện.

## Quy trình Thực thi

### 1. Đồng bộ Prototype
- Đảm bảo tất cả các trang prototype (`src/app/(prototype)/prototype/*`) đã được cập nhật đồng bộ với các components và pages thật trong ứng dụng.

### 2. Thu thập Hình ảnh (Screen Capturing)
- **Chuẩn bị**: Cần chạy Local Dev Server (ví dụ `npm run dev`) trên một background task.
- **Kịch bản**: Viết một script Playwright để tự động đi qua các trang:
  - `/prototype/home`
  - `/prototype/signin`
  - `/prototype/signup`
  - `/prototype/tree`
  - `/prototype/tree/empty`
- **Thiết bị**: Tại mỗi trang, chụp hình với 3 viewport (kích thước):
  - Desktop: 1280 x 800
  - Tablet: 768 x 1024
  - Mobile: 375 x 667
- Lưu toàn bộ ảnh.
- **LƯU Ý THỰC THI (Playwright)**: Tuyệt đối không chạy script trực tiếp bằng `node script.js` nếu môi trường chưa cài đặt module `playwright`. Thay vào đó, hãy chạy `npx playwright test` (nếu dự án đã cấu hình) HOẶC sử dụng `npx playwright install` và cài đặt `playwright-core` vào một thư mục tạm trước khi thực thi script, hoặc hướng dẫn rõ ràng người dùng cách chạy.

### 3. Phân tích (Vision Analysis)
- Đọc tất cả các ảnh đã chụp bằng năng lực đa phương thức của model.
- Chỉ ra các **Lỗi UI (Bugs)** (chữ đè lên nhau, tràn viền, màu nền lỗi, icon méo, margin/padding lệch nghiêm trọng).
- Chỉ ra các **Điểm cần cải thiện (Polishing)** theo các nguyên tắc thiết kế tốt (spacing chưa thoáng, font size quá nhỏ/lớn, thiếu visual hierarchy, tương phản kém).

### 4. Báo cáo (Reporting)
- Tổng hợp thành một Artifact dạng bảng hoặc danh sách (ví dụ `ui_audit_report.md`).
- **Lưu ý quan trọng**: Tuyệt đối KHÔNG TỰ Ý SỬA CODE ngay sau khi tìm ra lỗi. Cần cung cấp danh sách trước để người dùng review (Duyệt) rồi mới nhận lệnh sửa cụ thể.

## Yêu cầu môi trường
- NodeJS, Playwright.
- Project gốc là thư mục hiện tại.
