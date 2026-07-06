/**
 * Static content for the in-application Help_System (Requirement 17).
 *
 * Each entry is one required topic from acceptance criterion 17.2. The content
 * is static and in-app (no backend, no async), which lets the guide render well
 * within the 2-second budget (17.3). The `id` of each topic is used as the
 * in-page anchor target so every topic is reachable from the Help_System entry
 * point (17.4, 17.5).
 *
 * Topics required by 17.2:
 *  1. solid (Derived_Relationship) vs dashed (Asserted_Relationship) lines
 *  2. adding a relative as a derived and as an asserted relationship
 *  3. how the Kinship_Resolver computes a Form_Of_Address
 *  4. how to change the Viewpoint
 *  5. how to claim a Person node by verification
 *  6. how to select a Region
 */

export interface HelpTopic {
  /** Stable slug used as the in-page anchor id and nav link target. */
  id: string;
  /** Section heading shown in the nav and at the top of the section. */
  title: string;
  /** Short summary used as the nav link description. */
  summary: string;
  /** Body paragraphs rendered within the section. */
  paragraphs: string[];
}

export const HELP_TOPICS: HelpTopic[] = [
  {
    id: "duong-net-lien-va-net-dut",
    title: "Đường nét liền và nét đứt",
    summary:
      "Phân biệt quan hệ suy ra (nét liền) với quan hệ khai báo trực tiếp (nét đứt).",
    paragraphs: [
      "Đường nét liền biểu diễn quan hệ suy ra (Derived_Relationship): các quan hệ huyết thống cha-con, mẹ-con và quan hệ hôn nhân được lưu dưới dạng cạnh nguyên thủy. Từ những cạnh này, hệ thống có thể tự động tính cách xưng hô.",
      "Đường nét đứt biểu diễn quan hệ khai báo (Asserted_Relationship): bạn gán một nhãn xưng hô trực tiếp, ví dụ “người này là bác của tôi”, mà chưa có các nút trung gian để suy ra quan hệ. Vì thiếu đường đi huyết thống nên hệ thống chưa thể tự suy ra cách xưng hô và giữ nguyên nhãn bạn khai báo.",
      "Khi bạn bổ sung các nút trung gian tạo thành một đường huyết thống liên tục giữa hai người, quan hệ nét đứt sẽ được nâng cấp thành nét liền. Nếu cách xưng hô suy ra khác với nhãn đã khai báo, hệ thống hiển thị cảnh báo xung đột kèm cả hai giá trị.",
    ],
  },
  {
    id: "them-nguoi-than",
    title: "Thêm người thân (nét liền và nét đứt)",
    summary:
      "Cách thêm người thân theo quan hệ suy ra hoặc bằng nhãn khai báo trực tiếp.",
    paragraphs: [
      "Để thêm người thân dưới dạng quan hệ suy ra (nét liền), hãy chọn một quan hệ nguyên thủy: cha-con, mẹ-con hoặc vợ-chồng. Hệ thống lưu cạnh huyết thống hoặc hôn nhân tương ứng và có thể tính cách xưng hô tới mọi người được nối bằng các quan hệ suy ra.",
      "Để thêm người thân khi bạn chưa biết các nút trung gian, hãy dùng chế độ khai báo (nét đứt): nhập một nhãn xưng hô trực tiếp dài từ 1 đến 50 ký tự, ví dụ “bác”. Hệ thống lưu quan hệ này như một Asserted_Relationship nối đúng hai người bạn chỉ định.",
      "Sau này, khi bạn thêm các cạnh huyết thống hoàn thiện đường đi giữa hai người, quan hệ khai báo sẽ tự động được xem xét nâng cấp lên nét liền.",
    ],
  },
  {
    id: "cach-tinh-xung-ho",
    title: "Cách hệ thống tính cách xưng hô",
    summary:
      "Kinship_Resolver suy ra Form_Of_Address từ đường đi quan hệ, bên nội/ngoại, giới tính và vai vế.",
    paragraphs: [
      "Kinship_Resolver chỉ làm việc trên các quan hệ suy ra: cạnh huyết thống (cha/mẹ-con) và cạnh hôn nhân. Các quan hệ xã hội và quan hệ khai báo không tham gia vào việc tính toán đường đi.",
      "Từ điểm nhìn (Viewpoint), hệ thống tìm đường đi quan hệ ngắn nhất tới người được chọn, rồi rút gọn thành các yếu tố quyết định cách xưng hô: số đời đi lên/đi xuống, bên nội hay bên ngoại, giới tính của người đích và thứ tự sinh (anh/chị hay em).",
      "Bên nội dùng các từ như bác/chú, bên ngoại dùng cậu. Thứ tự sinh được xác định theo vai vế (birth order), nếu thiếu thì dựa vào năm sinh. Khi không đủ dữ liệu để phân biệt, hệ thống trả về chỉ báo “chưa xác định”.",
      "Cuối cùng, hệ thống tra cứu từ xưng hô theo vùng miền hiện tại của cây để trả về thuật ngữ phù hợp.",
    ],
  },
  {
    id: "doi-diem-nhin",
    title: "Đổi điểm nhìn (Viewpoint)",
    summary: "Xem cách một người bất kỳ xưng hô với mọi người còn lại trong cây.",
    paragraphs: [
      "Điểm nhìn là người mà từ góc nhìn của họ cách xưng hô được tính. Khi bạn chọn một người làm điểm nhìn, hệ thống tính lại cách xưng hô từ người đó tới mọi người khác trong cây.",
      "Dùng bộ chọn điểm nhìn trên màn hình sơ đồ để chuyển điểm nhìn. Sơ đồ sẽ hiển thị lại toàn bộ cách xưng hô mà không cần lưu thêm dữ liệu quan hệ nào.",
      "Nếu một người không thể suy ra cách xưng hô từ điểm nhìn đã chọn, người đó được đánh dấu là “chưa xác định”.",
    ],
  },
  {
    id: "xac-nhan-nut",
    title: "Xác nhận (claim) một nút bằng mã xác thực",
    summary: "Người thân được mời có thể xác nhận và nhận nút của mình.",
    paragraphs: [
      "Chủ cây có thể gửi lời mời tới số điện thoại hoặc email cho một nút chưa được xác nhận. Lời mời chứa mã xác thực 6 chữ số có hiệu lực trong 15 phút.",
      "Người được mời nhập mã đúng trong thời hạn để liên kết nút đó với tài khoản của mình; khi đó nút trở thành Claimed_Node. Người dùng đã liên kết có thể chỉnh sửa nút của chính mình.",
      "Nếu mã sai, hết hạn, hoặc nhập sai 5 lần liên tiếp, hệ thống từ chối và giữ nguyên trạng thái chưa xác nhận của nút. Không thể mời lại một nút đã được xác nhận.",
    ],
  },
  {
    id: "chon-vung-mien-va-bao-mat",
    title: "Cài đặt cây (Vùng miền & Quyền riêng tư)",
    summary: "Đặt phương ngữ và tùy chọn ẩn thông tin người còn sống.",
    paragraphs: [
      "Cách xưng hô tiếng Việt khác nhau theo vùng miền. Chủ cây có thể đổi vùng miền sang Bắc, Trung hoặc Nam để hệ thống sử dụng từ ngữ phù hợp (ví dụ: Bác/Chú vs Cậu).",
      "Ngoài ra, chủ cây có thể bật tính năng 'Ẩn thông tin người còn sống' trong phần Cài đặt. Khi bật, hệ thống sẽ tự động che dấu ngày sinh và các thông tin nhạy cảm của những thành viên đang còn sống đối với khách vãng lai, đảm bảo quyền riêng tư tối đa."
    ],
  },
  {
    id: "cong-tac-vien",
    title: "Quản lý cộng tác viên",
    summary: "Mời người thân cùng tham gia chỉnh sửa và xây dựng gia phả.",
    paragraphs: [
      "Xây dựng gia phả là công việc của cả dòng họ. Chủ cây có thể mở cửa sổ 'Cộng tác' để mời các thành viên khác cùng quản lý cây.",
      "Bạn có thể nhập email của người thân để gửi lời mời. Người được mời sẽ nhận được một mã tham gia. Khi họ nhập mã này, họ sẽ trở thành cộng tác viên và có quyền thêm, sửa thông tin thành viên trong cây.",
      "Chủ cây có toàn quyền quản lý danh sách cộng tác viên, phê duyệt lời mời hoặc xóa quyền truy cập bất cứ lúc nào."
    ],
  },
  {
    id: "tim-duong-di",
    title: "Tìm kiếm và phân tích đường đi",
    summary: "Tìm nhanh thành viên và xem sơ đồ kết nối giữa hai người.",
    paragraphs: [
      "Sử dụng thanh tìm kiếm (có biểu tượng kính lúp) để tìm nhanh một thành viên theo tên. Khi chọn một kết quả, bản đồ sẽ tự động di chuyển và phóng to tới vị trí của người đó.",
      "Khi lần đầu truy cập giao diện cây, hệ thống hiển thị các tooltip ngắn để chỉ vị trí thanh tìm kiếm, bộ chọn góc nhìn, nút thêm thành viên, cộng tác và cụm điều hướng bản đồ. Bạn có thể bấm Tiếp theo để xem hết hoặc Bỏ qua nếu đã quen thao tác.",
      "Để hiểu rõ quan hệ giữa hai người bất kỳ, bạn có thể thiết lập một người làm 'Điểm nhìn' (Viewpoint), sau đó chọn người kia và nhấn biểu tượng 'Tìm đường đi'. Hệ thống sẽ làm nổi bật con đường huyết thống hoặc hôn nhân ngắn nhất nối liền hai người."
    ],
  },
  {
    id: "ca-nhan-hoa-giao-dien",
    title: "Cá nhân hóa giao diện",
    summary: "Thay đổi chế độ tối/sáng và kích thước văn bản.",
    paragraphs: [
      "Hệ thống hỗ trợ cá nhân hóa giao diện hiển thị để bảo vệ mắt và dễ đọc hơn. Bạn có thể thay đổi kích thước chữ (từ 100% đến 200%) ngay trên thanh công cụ của sơ đồ.",
      "Để bật Giao diện tối (Dark Mode), hãy truy cập mục 'Cài đặt' từ menu bên trái. Chế độ tối sử dụng các gam màu trầm ấm giúp dịu mắt khi sử dụng vào ban đêm."
    ],
  }
];
