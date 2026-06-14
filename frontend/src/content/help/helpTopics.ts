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
    id: "chon-vung-mien",
    title: "Chọn vùng miền (Region)",
    summary: "Đặt phương ngữ Bắc, Trung hoặc Nam để chọn từ xưng hô phù hợp.",
    paragraphs: [
      "Cách xưng hô tiếng Việt khác nhau theo vùng miền. Mỗi cây có một vùng miền mặc định, được đặt là Bắc khi tạo cây nếu bạn không chọn khác.",
      "Chủ cây có thể đổi vùng miền sang một trong ba giá trị: Bắc, Trung hoặc Nam. Mọi cách xưng hô được yêu cầu sau khi đổi sẽ dùng từ của vùng miền mới.",
      "Nếu bạn chọn một giá trị không hợp lệ, hệ thống từ chối thay đổi và giữ nguyên vùng miền trước đó.",
    ],
  },
];
