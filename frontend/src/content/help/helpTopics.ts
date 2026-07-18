/** Canonical, runtime-reviewed guidance content for CGP-GUIDE-001. */
export type GuidanceRole = "owner" | "editor" | "reader";
export type HelpTopicStatus = "active" | "conditional" | "retired";
export type HelpExcerptKey = "overview" | "checklist" | "contextual";

export type HelpTopicCategory = "bat-dau" | "nguoi-va-quan-he" | "tim-va-xung-ho" | "quyen-va-rieng-tu" | "tuy-chinh-va-ho-tro";

export const CATEGORY_LABELS: Record<HelpTopicCategory, string> = {
  "bat-dau": "Bắt đầu",
  "nguoi-va-quan-he": "Người và quan hệ",
  "tim-va-xung-ho": "Tìm và xưng hô",
  "quyen-va-rieng-tu": "Quyền và riêng tư",
  "tuy-chinh-va-ho-tro": "Tùy chỉnh và hỗ trợ"
};
export interface HelpTopic {
  id: string;
  aliases?: string[];
  version: number;
  status: HelpTopicStatus;
  roles: GuidanceRole[];
  category: HelpTopicCategory;
  keywords: string[];
  title: string;
  summary: string;
  purpose: string;
  prerequisites: string[];
  steps: string[];
  success: string;
  recovery: string;
  privacyNote?: string;
  excerpts: Partial<Record<HelpExcerptKey, string>>;
  relatedTopicIds: string[];
  reviewedAt: string;
}

const ALL_ROLES: GuidanceRole[] = ["owner", "editor", "reader"];

export const HELP_TOPICS: HelpTopic[] = [
  {
    id: "tao-hoac-mo-cay", version: 4, status: "active", roles: ALL_ROLES,
    category: "bat-dau", keywords: ["tạo", "mở", "mã mời", "tham gia"],
    title: "Tạo, tham gia hoặc mở một cây", summary: "Tạo cây mới, nhập mã mời 6 ký tự hoặc mở cây bạn đã có quyền xem.",
    purpose: "Đi vào không gian gia đình để bắt đầu ghi lại, xem và cùng hoàn thiện các mối quan hệ.",
    prerequisites: ["Bạn đã đăng nhập."],
    steps: ["Mở mục Danh sách cây.", "Chọn một cây có sẵn, hoặc chọn + Thêm cây.", "Chọn Tạo cây mới, hoặc chọn Tham gia bằng mã mời và nhập mã 6 ký tự do người thân gửi."],
    success: "Cây xuất hiện trong danh sách và có thể mở bằng nút Xem sơ đồ.",
    recovery: "Nếu mã mời không hợp lệ hoặc đã hết hạn, xin mã mới từ chủ cây. Chỉ những cây bạn được phép xem mới xuất hiện.",
    excerpts: { overview: "Tạo cây mới, nhập mã mời của người thân hoặc mở cây bạn đã có.", checklist: "Chọn + Thêm cây để tạo cây mới, nhập mã mời hoặc mở cây đã có.", contextual: "Liên kết Các cây đưa bạn về danh sách; phần giữa hiển thị Xét vai vế theo [Tên] để cho biết người đang được dùng làm mốc tính cách xưng hô." },
    relatedTopicIds: ["them-nguoi-dau-tien", "moi-va-quan-ly-cong-tac"], reviewedAt: "2026-07-17",
  },
  {
    id: "thao-tac-trong-cay", version: 2, status: "active", roles: ALL_ROLES,
    category: "bat-dau", keywords: ["danh sách", "sơ đồ", "chọn người", "thao tác"],
    title: "Làm quen với các thao tác trong cây", summary: "Tìm trong danh sách, xem sơ đồ và mở thông tin của từng người.",
    purpose: "Giúp bạn tìm đúng người trước khi xem hoặc cập nhật dữ liệu.",
    prerequisites: ["Bạn đã mở một cây."],
    steps: ["Dùng ô tìm kiếm ở đầu danh sách để tìm theo tên hoặc cách xưng hô.", "Chuyển sang Sơ đồ khi bạn muốn xem các đường quan hệ.", "Chọn một người để mở thông tin. Thao tác khác chỉ chứa hướng dẫn và các mục quản lý mà tài khoản của bạn được phép dùng."],
    success: "Bạn tìm được người cần xem và mở đúng thao tác.",
    recovery: "Nếu chưa thấy thao tác cần dùng, chọn lại người hoặc kiểm tra quyền hiện tại của tài khoản.",
    excerpts: { contextual: "Chọn Thêm người mới để nối một thành viên mới vào cây. Mở Thao tác khác khi bạn cần hướng dẫn hoặc quản lý cây." },
    relatedTopicIds: ["them-nguoi-moi", "sua-va-them-thanh-vien", "xem-va-luu-so-do"], reviewedAt: "2026-07-17",
  },
  {
    id: "them-nguoi-dau-tien", version: 2, status: "active", roles: ["owner", "editor"],
    category: "bat-dau", keywords: ["thêm người", "bản thân", "bắt đầu"],
    title: "Thêm người đầu tiên", summary: "Bắt đầu cây bằng chính bạn hoặc một người thân.",
    purpose: "Tạo điểm bắt đầu để sau đó nối thêm cha, mẹ, vợ/chồng hoặc con.",
    prerequisites: ["Cây đang trống.", "Bạn có quyền chỉnh sửa cây."],
    steps: ["Mở cây và chọn Thêm thành viên.", "Nhập họ tên, giới tính và các thông tin bạn đang biết.", "Chọn nút tạo thành viên để lưu."],
    success: "Người vừa thêm xuất hiện trên sơ đồ.", recovery: "Nếu chưa lưu được, kiểm tra các trường được báo lỗi rồi thử lại.",
    excerpts: { checklist: "Chọn Thêm thành viên và bắt đầu với chính bạn hoặc một người thân.", contextual: "Điền vài thông tin cơ bản. Bạn có thể bổ sung chi tiết sau." },
    relatedTopicIds: ["them-nguoi-moi", "luu-anh-ky-niem"], reviewedAt: "2026-07-13",
  },
  {
    id: "them-nguoi-moi", version: 1, status: "active", roles: ["owner", "editor"],
    category: "nguoi-va-quan-he", keywords: ["thêm người mới", "cha", "mẹ", "con", "vợ", "chồng"],
    title: "Thêm người mới vào cây", summary: "Tạo một thành viên mới và nối họ với người đã có trong cây.",
    purpose: "Giữ việc tạo hồ sơ mới tách biệt với việc nối hai hồ sơ đã tồn tại.",
    prerequisites: ["Cây có ít nhất một người.", "Bạn có quyền cập nhật quan hệ của một thành viên."],
    steps: ["Chọn Thêm người mới ở cuối workspace.", "Trong mục Người mới có quan hệ với, chọn người sẽ làm mốc.", "Chọn quan hệ, nhập họ tên rồi lưu. Bạn có thể mở Thêm thông tin khác nếu muốn điền thêm."],
    success: "Người vừa tạo xuất hiện trong cây và bảng thông tin của họ được mở.",
    recovery: "Nếu chưa lưu được, kiểm tra trường đang báo lỗi. Nếu không thấy người làm mốc, tài khoản hiện tại chưa có quyền nối quan hệ với người đó.",
    privacyNote: "Chỉ nhập thông tin mà người thân đồng ý chia sẻ trong cây.",
    excerpts: { checklist: "Chọn Thêm người mới, chọn người làm mốc rồi xác nhận quan hệ.", contextual: "Thêm người mới tạo một hồ sơ mới và nối hồ sơ đó với người bạn chọn làm mốc." },
    relatedTopicIds: ["sua-va-them-thanh-vien", "them-quan-he-ro-rang"], reviewedAt: "2026-07-17",
  },
  {
    id: "sua-va-them-thanh-vien", version: 2, status: "active", roles: ALL_ROLES,
    category: "nguoi-va-quan-he", keywords: ["sửa thông tin", "thêm thành viên", "thêm người", "cập nhật"],
    title: "Sửa thông tin và cập nhật quan hệ", summary: "Chỉnh sửa hồ sơ hoặc nối người đang xem với một thành viên đã có.",
    purpose: "Đưa từng thao tác vào đúng bảng thông tin của thành viên để bạn biết mình đang sửa ai.",
    prerequisites: ["Cây có ít nhất một người.", "Trong bảng thông tin, tài khoản của bạn thấy Chỉnh sửa thông tin hoặc Cập nhật quan hệ."],
    steps: ["Chọn người cần cập nhật.", "Chọn Chỉnh sửa thông tin để sửa hồ sơ, hoặc Cập nhật quan hệ để nối người này với một thành viên đã có trong cây.", "Dùng nút quay lại để về thông tin người đó. Nút X đóng toàn bộ bảng thông tin."],
    success: "Thông tin hoặc quan hệ mới đã được lưu.",
    recovery: "Nếu không thấy nút cần dùng, tài khoản hiện tại chưa có quyền thực hiện thao tác đó. Hãy nhờ người có quyền hỗ trợ.",
    privacyNote: "Chỉ lưu thông tin mà người thân đồng ý chia sẻ trong cây.",
    excerpts: { contextual: "Dùng Chỉnh sửa thông tin để sửa hồ sơ. Dùng Cập nhật quan hệ để nối hai thành viên đã có trong cây." },
    relatedTopicIds: ["them-nguoi-moi", "them-quan-he-ro-rang", "luu-anh-ky-niem"], reviewedAt: "2026-07-17",
  },
  {
    id: "them-quan-he-ro-rang", aliases: ["them-nguoi-than", "duong-net-lien-va-net-dut"], version: 3, status: "active", roles: ["owner", "editor"],
    category: "nguoi-va-quan-he", keywords: ["cha", "mẹ", "vợ", "chồng", "con", "cập nhật quan hệ"],
    title: "Nối hai thành viên đã có", summary: "Thêm quan hệ cha, mẹ, con hoặc vợ/chồng giữa hai người đã có trong cây.",
    purpose: "Bổ sung một đường quan hệ trực tiếp để hệ thống có thể tính cách xưng hô.",
    prerequisites: ["Cây có ít nhất hai người.", "Bạn có quyền cập nhật quan hệ của người đang xem."],
    steps: ["Chọn một người và mở bảng thông tin.", "Chọn Cập nhật quan hệ.", "Chọn thành viên đã có trong cây, xác nhận quan hệ với người đang xem rồi lưu."],
    success: "Đường quan hệ trực tiếp xuất hiện giữa hai thành viên.",
    recovery: "Người đã có quan hệ cha, mẹ, con hoặc vợ/chồng trực tiếp sẽ không thể chọn lại. Nếu hệ thống báo xung đột với một đường nét đứt cũ, hãy kiểm tra cả tên gọi cũ và quan hệ vừa chọn.",
    excerpts: { contextual: "Cập nhật quan hệ chỉ nối hai thành viên đã có. Muốn tạo hồ sơ mới, dùng Thêm người mới." },
    relatedTopicIds: ["them-nguoi-moi", "doc-duong-quan-he", "xem-thong-tin-va-xung-ho"], reviewedAt: "2026-07-17",
  },
  {
    id: "xem-thong-tin-va-xung-ho", aliases: ["cach-tinh-xung-ho"], version: 3, status: "active", roles: ALL_ROLES,
    category: "tim-va-xung-ho", keywords: ["xưng hô", "thông tin", "cách gọi", "vai vế"],
    title: "Xem thông tin và cách xưng hô", summary: "Chọn một người để xem thông tin và cách gọi theo người đang được dùng để xét vai vế.",
    purpose: "Hiểu một người là ai và nên xưng hô thế nào theo đường quan hệ, người đang xét và vùng miền của cây.",
    prerequisites: ["Cây có ít nhất một người."],
    steps: ["Chọn một người trên sơ đồ.", "Xem bảng thông tin ở cạnh màn hình và đọc cách xưng hô theo người đang xét.", "Nếu cần, đổi người xét hoặc vùng miền để xem cách gọi khác."],
    success: "Phần thông tin hiển thị cách xưng hô, hoặc báo chưa xác định khi dữ liệu chưa đủ.",
    recovery: "Nếu chưa xác định, hãy kiểm tra các quan hệ nối giữa hai người hoặc thử chọn người xét khác.",
    excerpts: { checklist: "Chọn một người trên sơ đồ để mở thông tin và xem cách xưng hô.", contextual: "Chọn một người để xem thông tin và cách xưng hô theo người đang xét." },
    relatedTopicIds: ["doi-diem-nhin", "chon-vung-mien"], reviewedAt: "2026-07-17",
  },
  {
    id: "doi-diem-nhin", version: 3, status: "active", roles: ALL_ROLES,
    category: "tim-va-xung-ho", keywords: ["đổi người xét", "xét vai vế", "điểm nhìn", "góc nhìn", "xưng hô"],
    title: "Đổi người xét", summary: "Tính lại cách xưng hô khi xét vai vế theo một người khác trong cây.",
    purpose: "Cách gọi thay đổi theo người đang được dùng để xét vai vế.",
    prerequisites: ["Cây có ít nhất hai người."],
    steps: ["Chọn Đổi người xét trên thanh công cụ.", "Chọn một người khác để xét vai vế theo người đó.", "Đợi các cách xưng hô trên sơ đồ được tính lại."],
    success: "Cách xưng hô trên sơ đồ được tính lại theo người vừa chọn.", recovery: "Nếu chưa thấy kết quả xét vai vế, đợi tải xong hoặc kiểm tra đường quan hệ giữa các thành viên.",
    excerpts: { checklist: "Chọn Đổi người xét để tính lại cách xưng hô theo một người khác.", contextual: "Đổi người xét để xem cách gọi trong gia đình thay đổi thế nào." },
    relatedTopicIds: ["xem-thong-tin-va-xung-ho"], reviewedAt: "2026-07-17",
  },
  {
    id: "dieu-huong-so-do", aliases: ["tim-duong-di"], version: 4, status: "active", roles: ALL_ROLES,
    category: "tim-va-xung-ho", keywords: ["tìm kiếm", "kéo", "thu phóng", "di chuyển", "sơ đồ"],
    title: "Tìm người và di chuyển trên sơ đồ", summary: "Tìm kiếm, kéo và thu phóng trong vùng xem có giới hạn.",
    purpose: "Khám phá cây mà không làm thay đổi dữ liệu hoặc kéo sơ đồ ra khỏi vùng có thể đọc.", prerequisites: ["Cây đã có thành viên."],
    steps: ["Nhập tên hoặc cách xưng hô vào ô tìm kiếm ở đầu danh sách để chọn nhanh một người.", "Kéo vùng trống để di chuyển. Sơ đồ sẽ tự dừng ở giới hạn của cả bốn hướng.", "Dùng nút thu phóng hoặc cuộn chuột. Trên màn hình cảm ứng, dùng hai ngón tay. Thu phóng sẽ dừng khi chạm giới hạn."],
    success: "Người hoặc nhánh bạn cần xem nằm trong vùng hiển thị.", recovery: "Mở Điều khiển sơ đồ và chọn Đặt lại để trở về trạng thái ban đầu.",
    excerpts: { contextual: "Kéo vùng trống để di chuyển trong giới hạn bốn hướng. Bạn cũng có thể dùng các nút thu phóng; không cần nhớ thao tác bằng cử chỉ." },
    relatedTopicIds: ["xem-thong-tin-va-xung-ho"], reviewedAt: "2026-07-17",
  },
  {
    id: "xem-va-luu-so-do", version: 2, status: "active", roles: ALL_ROLES,
    category: "tim-va-xung-ho", keywords: ["sơ đồ", "đặt lại", "toàn màn hình", "tải svg", "lưu ảnh"],
    title: "Xem và lưu sơ đồ", summary: "Căn lại góc nhìn, mở toàn màn hình hoặc lưu sơ đồ thành tệp SVG.",
    purpose: "Đọc sơ đồ rõ hơn và lưu một bản để xem lại khi cần.",
    prerequisites: ["Cây đã có thành viên."],
    steps: ["Mở Điều khiển sơ đồ.", "Dùng thu phóng trong giới hạn hoặc căn giữa; chọn Đặt lại để đưa vùng xem về trạng thái ban đầu.", "Chọn Toàn màn hình để xem rộng hơn hoặc Tải SVG để lưu sơ đồ."],
    success: "Sơ đồ nằm trong khung dễ đọc hoặc tệp SVG đã được lưu.",
    recovery: "Nếu bị lạc trên sơ đồ, mở Điều khiển sơ đồ và chọn Đặt lại.",
    privacyNote: "Tệp đã lưu có thể chứa thông tin gia đình; chỉ chia sẻ với người phù hợp.",
    excerpts: { contextual: "Mở Điều khiển sơ đồ để căn lại, xem toàn màn hình hoặc tải tệp SVG." },
    relatedTopicIds: ["dieu-huong-so-do", "doc-duong-quan-he"], reviewedAt: "2026-07-17",
  },
  {
    id: "doc-duong-quan-he", version: 3, status: "active", roles: ALL_ROLES,
    category: "nguoi-va-quan-he", keywords: ["đường", "nét liền", "nét đứt", "chú thích"],
    title: "Đọc đường quan hệ", summary: "Phân biệt đường quan hệ rõ ràng và quan hệ được khai báo.",
    purpose: "Hiểu ý nghĩa của các kiểu đường nối trên sơ đồ.", prerequisites: ["Cây có quan hệ giữa các thành viên."],
    steps: ["Mở Chú giải sơ đồ.", "Đường liền biểu diễn quan hệ trực tiếp mà hệ thống có thể dùng để tính xưng hô.", "Đường nét đứt biểu diễn tên gọi tự khai báo khi chưa đủ người trung gian."],
    success: "Bạn nhận biết được vì sao một cách xưng hô có thể hoặc chưa thể tự tính.", recovery: "Bổ sung các quan hệ cha, mẹ, vợ/chồng hoặc con còn thiếu khi có đủ thông tin.",
    excerpts: { contextual: "Mở Chú giải sơ đồ để phân biệt quan hệ trực tiếp và tên gọi tự khai báo." }, relatedTopicIds: ["them-quan-he-ro-rang"], reviewedAt: "2026-07-15",
  },
  {
    id: "chon-vung-mien", aliases: ["chon-vung-mien-va-bao-mat"], version: 2, status: "active", roles: ["owner"],
    category: "tuy-chinh-va-ho-tro", keywords: ["vùng miền", "bắc", "trung", "nam", "cách gọi"],
    title: "Chọn vùng miền", summary: "Dùng cách gọi phù hợp với gia đình ở miền Bắc, Trung hoặc Nam.",
    purpose: "Điều chỉnh từ xưng hô mà hệ thống hiển thị.", prerequisites: ["Bạn là chủ cây."],
    steps: ["Mở Cài đặt trong cây.", "Chọn Miền Bắc, Miền Trung hoặc Miền Nam.", "Đóng cửa sổ cài đặt sau khi hệ thống cập nhật."], success: "Cách xưng hô được tính lại theo vùng đã chọn.",
    recovery: "Nếu chưa cập nhật, kiểm tra thông báo lỗi rồi chọn lại vùng hoặc tải lại cây.", excerpts: {}, relatedTopicIds: ["doi-diem-nhin"], reviewedAt: "2026-07-13",
  },
  {
    id: "dieu-chinh-hien-thi", aliases: ["ca-nhan-hoa-giao-dien"], version: 2, status: "active", roles: ALL_ROLES,
    category: "tuy-chinh-va-ho-tro", keywords: ["giao diện", "sáng", "tối", "cỡ chữ", "hiển thị"],
    title: "Điều chỉnh giao diện để dễ đọc", summary: "Đổi giao diện, tăng cỡ chữ và tùy chọn thông tin hiển thị trên cây.",
    purpose: "Giúp mọi thành viên trong gia đình đọc và thao tác thoải mái hơn.", prerequisites: [],
    steps: ["Mở Cài đặt để chọn giao diện Sáng, Tối hoặc Theo hệ thống.", "Chọn cỡ chữ từ 100% đến 200%.", "Trong Cài đặt cây, bật hoặc tắt năm sinh/năm mất trên các thành viên nếu cần."], success: "Giao diện thay đổi nhưng nội dung và nút thao tác vẫn đầy đủ.",
    recovery: "Nếu màn hình chật, cuộn theo chiều dọc; không cần thu nhỏ chữ để tiếp tục.", excerpts: {}, relatedTopicIds: [], reviewedAt: "2026-07-13",
  },
  {
    id: "moi-va-quan-ly-cong-tac", version: 1, status: "active", roles: ["owner"],
    category: "quyen-va-rieng-tu", keywords: ["mời", "cộng tác", "chia sẻ", "quyền"],
    title: "Mời và quản lý cộng tác viên", summary: "Mời qua email, mã hoặc liên kết và duyệt người muốn cùng chỉnh sửa cây.",
    purpose: "Cho phép người thân cùng bổ sung thông tin trong đúng cây gia phả.",
    prerequisites: ["Bạn là chủ cây.", "Cây đã được tạo."],
    steps: ["Mở cây và chọn Cộng tác.", "Nhập email để gửi lời mời, hoặc chọn Tạo mã mời để sao chép mã 6 ký tự hay liên kết mời.", "Khi có yêu cầu đang chờ, chọn Duyệt hoặc Từ chối."],
    success: "Người đã được duyệt xuất hiện trong danh sách cộng tác viên của cây.",
    recovery: "Nếu email không tới, kiểm tra thư rác hoặc gửi mã/liên kết mời trực tiếp. Mã hết hạn cần được tạo lại.",
    privacyNote: "Chỉ gửi mã hoặc liên kết mời cho người bạn muốn cấp quyền cộng tác.",
    excerpts: {}, relatedTopicIds: ["tao-hoac-mo-cay", "bao-mat-va-chia-se-cay"], reviewedAt: "2026-07-13",
  },
  {
    id: "luu-anh-ky-niem", version: 2, status: "active", roles: ALL_ROLES,
    category: "nguoi-va-quan-he", keywords: ["ảnh", "kỷ niệm", "thư viện", "đại diện"],
    title: "Lưu ảnh kỷ niệm cho thành viên", summary: "Xem ảnh theo năm và, khi có quyền, tải ảnh hoặc chọn ảnh đại diện.",
    purpose: "Lưu lại hình ảnh gắn với từng thành viên trong gia đình.",
    prerequisites: ["Cây có ít nhất một người.", "Chủ cây và cộng tác viên quản lý ảnh của mọi người; thành viên đã xác nhận quản lý ảnh của chính mình."],
    steps: ["Chọn một người trên sơ đồ và mở Thư viện ảnh.", "Nếu bạn có quyền sửa ảnh của người đó, chọn ảnh JPEG hoặc PNG, bổ sung năm chụp và mô tả nếu có, rồi chọn Lưu ảnh.", "Dùng Đặt làm ảnh đại diện hoặc Xóa khi cần quản lý ảnh đã tải."],
    success: "Ảnh xuất hiện trong thư viện của thành viên và được nhóm theo năm chụp.",
    recovery: "Nếu ảnh không tải được, kiểm tra định dạng JPEG/PNG, giới hạn dung lượng và số ảnh được phép.",
    privacyNote: "Chỉ tải ảnh mà gia đình đồng ý lưu và chia sẻ theo chế độ của cây.",
    excerpts: { contextual: "Chọn một người để xem Thư viện ảnh; tải ảnh lên khi nút Lưu ảnh xuất hiện." }, relatedTopicIds: ["bao-mat-va-chia-se-cay"], reviewedAt: "2026-07-15",
  },
  {
    id: "bao-mat-va-chia-se-cay", version: 1, status: "active", roles: ["owner"],
    category: "quyen-va-rieng-tu", keywords: ["bảo mật", "riêng tư", "chia sẻ", "ẩn", "công khai"],
    title: "Bảo vệ thông tin và chia sẻ cây", summary: "Ẩn thông tin người còn sống và chọn phạm vi riêng tư, liên kết hoặc công khai.",
    purpose: "Kiểm soát ai có thể xem cây và giảm thông tin nhạy cảm hiển thị về người còn sống.",
    prerequisites: ["Bạn là chủ cây."],
    steps: ["Mở Cài đặt trong cây.", "Bật Ẩn thông tin người còn sống nếu gia đình cần che dữ liệu nhạy cảm.", "Chọn Riêng tư, Bằng liên kết bí mật hoặc Công khai cho thành viên; với chế độ liên kết, tạo và sao chép liên kết chia sẻ."],
    success: "Cây áp dụng chế độ bảo vệ và chia sẻ vừa chọn.",
    recovery: "Nếu một liên kết không còn an toàn, chọn Hủy liên kết và tạo liên kết mới khi cần.",
    privacyNote: "Riêng tư là chế độ mặc định. Liên kết bí mật có thể bị chuyển tiếp, vì vậy chỉ gửi cho người đáng tin cậy.",
    excerpts: {}, relatedTopicIds: ["moi-va-quan-ly-cong-tac"], reviewedAt: "2026-07-13",
  },
  {
    id: "gui-phan-hoi-va-ung-ho", version: 1, status: "active", roles: ALL_ROLES,
    category: "tuy-chinh-va-ho-tro", keywords: ["phản hồi", "lỗi", "ủng hộ", "đóng góp"],
    title: "Gửi phản hồi và ủng hộ dự án", summary: "Báo lỗi, đề xuất tính năng hoặc hỗ trợ chi phí duy trì website.",
    purpose: "Giúp phiên bản truy cập sớm được cải thiện dựa trên trải nghiệm thực tế.",
    prerequisites: [],
    steps: ["Mở Feedback từ menu ứng dụng, chọn phân loại và mô tả vấn đề hoặc đề xuất.", "Nếu cần, đính kèm tối đa 3 ảnh JPEG hoặc PNG, mỗi ảnh tối đa 2MB, rồi chọn Gửi feedback.", "Mở Ủng hộ từ menu nếu bạn muốn góp phần duy trì và phát triển website."],
    success: "Trang Feedback xác nhận đã nhận phản hồi; trang Ủng hộ hiển thị thông tin hỗ trợ dự án.",
    recovery: "Nếu chưa gửi được, kiểm tra email, độ dài nội dung, định dạng ảnh và thử lại sau.",
    privacyNote: "Không gửi mật khẩu, mã xác nhận, token phiên hoặc dữ liệu gia đình nhạy cảm trong phản hồi.",
    excerpts: {}, relatedTopicIds: [], reviewedAt: "2026-07-13",
  },
  {
    id: "xac-nhan-day-la-toi", version: 1, status: "active", roles: ALL_ROLES,
    category: "quyen-va-rieng-tu", keywords: ["xác nhận", "hồ sơ", "chính mình", "liên kết"],
    title: "Xác nhận đây là tôi", summary: "Liên kết đúng hồ sơ trong cây với tài khoản đã đăng nhập bằng mã xác nhận.",
    purpose: "Cho phép bạn quản lý thông tin và ảnh của chính mình mà không cấp quyền chỉnh sửa toàn bộ cây.",
    prerequisites: ["Chủ cây đã gửi lời mời xác nhận từ đúng hồ sơ của bạn.", "Bạn đăng nhập hoặc đăng ký bằng đúng email nhận lời mời; số điện thoại chỉ dùng cho tài khoản cũ đã được xác minh."],
    steps: ["Mở liên kết Xác nhận đây là tôi có đường dẫn /claim/[personId] trong lời mời.", "Nếu chưa đăng nhập, hoàn tất đăng nhập hoặc đăng ký; hệ thống sẽ đưa bạn trở lại đúng hồ sơ.", "Nhập mã xác nhận và chọn Xác nhận đây là tôi."],
    success: "Hồ sơ được liên kết với tài khoản của bạn và cây mở ở đúng không gian gia đình với quyền Thành viên đã xác nhận.",
    recovery: "Nếu danh tính tài khoản không khớp, mã đã hết hạn hoặc đã được thay thế, hãy đăng nhập đúng tài khoản và nhờ chủ cây gửi lời mời mới.",
    privacyNote: "Chỉ gửi mã xác nhận cho đúng người được mời. Trang xác nhận không yêu cầu bạn nhập lại email, số điện thoại hay định danh khác.",
    excerpts: {}, relatedTopicIds: ["xem-thong-tin-va-xung-ho", "luu-anh-ky-niem"], reviewedAt: "2026-07-13",
  },
];

export function getActiveHelpTopics(role?: GuidanceRole) {
  return HELP_TOPICS.filter((topic) => topic.status === "active" && (!role || topic.roles.includes(role)));
}

export function getHelpTopic(id: string, role?: GuidanceRole) {
  return getActiveHelpTopics(role).find((topic) => topic.id === id || topic.aliases?.includes(id));
}

export function getHelpExcerpt(topicId: string, key: HelpExcerptKey, role?: GuidanceRole) {
  return getHelpTopic(topicId, role)?.excerpts[key];
}

import { normalizeName } from "@/lib/nameNormalize";

export function searchHelpTopics(query: string, category: HelpTopicCategory | "all" = "all", role?: GuidanceRole) {
  const topics = getActiveHelpTopics(role);
  let filtered = topics;
  if (category !== "all") {
    filtered = filtered.filter(t => t.category === category);
  }
  const q = normalizeName(query);
  if (!q) return filtered;

  return filtered.filter(t => {
    return normalizeName(t.title).includes(q) ||
           normalizeName(t.summary).includes(q) ||
           t.keywords.some(k => normalizeName(k).includes(q));
  });
}
