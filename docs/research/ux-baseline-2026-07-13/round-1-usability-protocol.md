# Usability test vòng 1 — baseline và ba visual direction

## Mục tiêu

So sánh UI hiện tại với ba giả thuyết `Person-centric`, `List-first` và
`Accessible graph-first`, tập trung vào khả năng biết bấm đâu, hiểu đang xem ai và khôi phục sau khi
nhập sai. Vòng này chọn visual direction; không dùng để tuyên bố production đã usable.

## Người tham gia

- 6–8 người Việt Nam; tối thiểu 3 người 60–69 và 3 người 70+.
- Có cả mức tự tin công nghệ thấp và trung bình; có iOS và Android khi tuyển được.
- Ghi nhận vùng Bắc/Trung/Nam nhưng không dùng làm tiêu chí loại trừ.
- Session chính thực hiện một mình; caregiver/helper dyad là nghiên cứu riêng.
- Dùng ID `P01`…`P08`; không ghi tên thật, dữ liệu gia đình, tài khoản, mã mời hoặc thông tin liên hệ
  vào results file.

## Chuẩn bị và an toàn

- Nói rõ: “Chúng tôi đang kiểm thử sản phẩm, không kiểm tra khả năng của cô/chú/bác.”
- Chỉ dùng mock family data trong prototype.
- Xin consent riêng cho ghi âm/quay màn hình; nếu không có consent, chỉ ghi observation ẩn danh.
- Dừng hoặc nghỉ ngay khi người tham gia mệt, căng thẳng hoặc yêu cầu.
- Moderator dùng neutral probe: “Cô/chú/bác đang mong đợi điều gì xảy ra?”; không chỉ nút cần bấm.

## Kịch bản baseline

Thực hiện trên mobile prototype hiện tại, không giải thích UI trước:

1. **Tạo/mở cây:** “Bác muốn bắt đầu ghi lại gia đình mình. Hãy cho biết bác sẽ bấm đâu để tạo một
   cây mới và thêm người đầu tiên.”
2. **Tìm và hiểu quan hệ:** “Hãy tìm Hằng Nhựt Long, xem nên gọi người này thế nào và đổi sang nhìn
   từ một người khác.”
3. **Sửa sai:** “Giả sử năm sinh vừa nhập sai. Hãy tìm cách sửa; trước khi lưu, cho biết điều gì làm
   bác yên tâm rằng mình không sửa nhầm người.”

Không yêu cầu hoàn thành mutation thật nếu prototype state không hỗ trợ. Ghi lại first tap, pause,
backtrack, Help open, mis-tap, assisted/unassisted completion và critical error.

## Concept test

Mỗi người xem cả ba concept ở cùng kích thước 390×844. Đảo thứ tự để giảm bias:

| Nhóm | Thứ tự |
|---|---|
| A | Person-centric → List-first → Accessible graph-first |
| B | List-first → Accessible graph-first → Person-centric |
| C | Accessible graph-first → Person-centric → List-first |

Với mỗi concept, không đọc tên direction cho người tham gia. Hỏi:

1. “Màn hình này đang cho bác biết bác đang xem ai?”
2. “Nếu muốn tìm một người khác, bác sẽ bấm đâu trước?”
3. “Nếu muốn thêm cha/mẹ/con cho người đang xem, bác sẽ bấm đâu?”
4. “Có phần nào bác không dám bấm vì sợ làm sai không?”
5. “Nếu bị lạc trên sơ đồ, bác sẽ làm gì để quay lại?”

Sau từng concept, ghi SEQ/confidence 1–7 và câu giải thích bằng lời của người tham gia. Không dùng
“đẹp nhất” làm tiêu chí chính; ưu tiên hiểu đúng context và task discovery.

## Results template

### Observation theo người

| ID | Tuổi | Thiết bị | Digital confidence | Baseline flow | Unassisted | Assisted | Critical error | First tap đúng | Backtrack | Help open | SEQ 1–7 | Ghi chú ẩn danh |
|---|---:|---|---|---|---|---|---|---|---:|---:|---:|---|
| P01 |  |  |  | Tạo/mở cây |  |  |  |  |  |  |  |  |
| P01 |  |  |  | Tìm/xưng hô |  |  |  |  |  |  |  |  |
| P01 |  |  |  | Sửa sai |  |  |  |  |  |  |  |  |

Lặp ba dòng cho `P02`…`P08`.

### So sánh concept

| Concept | Hiểu đúng “đang xem ai” | First tap đúng: tìm người | First tap đúng: thêm quan hệ | Tìm được recovery | Median confidence | Privacy/permission misunderstanding | Nhận xét chính |
|---|---:|---:|---:|---:|---:|---:|---|
| Person-centric |  |  |  |  |  |  |  |
| List-first |  |  |  |  |  |  |  |
| Accessible graph-first |  |  |  |  |  |  |  |

## Quy tắc chọn direction

1. Loại direction nếu có bất kỳ critical privacy/permission error nào hoặc không có non-gesture path.
2. Trong các direction còn lại, xếp theo:
   - tỷ lệ hiểu đúng context;
   - first-tap success cho tìm người và thêm quan hệ;
   - median confidence;
   - số backtrack/mis-tap;
   - số pattern mới cần học.
3. Nếu hai direction cách nhau dưới một người tham gia ở tiêu chí chính, ưu tiên direction dùng ít
   pattern mới hơn và giữ khả năng chuyển sang list/graph rõ ràng.
4. Người ra quyết định chọn visual direction sau khi xem bảng kết quả và ghi lý do vào phần dưới.

## Decision record

- **Ngày review:**
- **Số người hoàn thành:**
- **Direction được chọn:**
- **Lý do dựa trên evidence:**
- **Điểm phải sửa trước interactive prototype:**
- **Rủi ro/chưa chắc chắn còn lại:**

Sau decision record mới bắt đầu interactive prototype vòng 2. Gate vòng 2 vẫn là ≥80% unassisted
completion cho từng flow, median SEQ ≥5/7, không critical error và không mất chức năng ở 200% text.
