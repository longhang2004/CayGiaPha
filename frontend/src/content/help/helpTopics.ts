/** Canonical, runtime-reviewed guidance content for CGP-GUIDE-001. */
export type GuidanceRole = "owner" | "editor" | "reader";
export type HelpTopicStatus = "active" | "conditional" | "retired";
export type HelpExcerptKey = "overview" | "checklist" | "contextual";

export interface HelpTopic {
  id: string;
  aliases?: string[];
  version: number;
  status: HelpTopicStatus;
  roles: GuidanceRole[];
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
    id: "tao-hoac-mo-cay", version: 1, status: "active", roles: ALL_ROLES,
    title: "Tạo hoặc mở một cây", summary: "Chọn cây gia phả bạn muốn xem hoặc bắt đầu một cây mới.",
    purpose: "Đi vào không gian gia đình để bắt đầu ghi lại và xem các mối quan hệ.",
    prerequisites: ["Bạn đã đăng nhập."],
    steps: ["Mở mục Cây gia phả.", "Chọn một cây có sẵn, hoặc chọn Tạo cây mới nếu bạn chưa có cây."],
    success: "Tên cây và danh sách thành viên được hiển thị.",
    recovery: "Nếu cây không mở được, chọn Thử lại. Chỉ những cây bạn được phép xem mới xuất hiện.",
    excerpts: { overview: "Bắt đầu với một cây, thêm người thân rồi nối những quan hệ gần nhất.", checklist: "Chọn nơi bạn muốn bắt đầu ghi lại gia đình." },
    relatedTopicIds: ["them-nguoi-dau-tien"], reviewedAt: "2026-07-11",
  },
  {
    id: "them-nguoi-dau-tien", version: 1, status: "active", roles: ["owner", "editor"],
    title: "Thêm người đầu tiên", summary: "Bắt đầu cây bằng chính bạn hoặc một người thân.",
    purpose: "Tạo điểm bắt đầu để sau đó nối thêm cha, mẹ, vợ/chồng hoặc con.",
    prerequisites: ["Cây đang trống.", "Bạn có quyền chỉnh sửa cây."],
    steps: ["Nhập tên người đầu tiên.", "Chọn giới tính.", "Chọn Lưu."],
    success: "Người vừa thêm xuất hiện trên sơ đồ.", recovery: "Nếu chưa lưu được, kiểm tra các trường được báo lỗi rồi thử lại.",
    excerpts: { checklist: "Bắt đầu với chính bạn hoặc một người thân.", contextual: "Điền vài thông tin cơ bản. Bạn có thể bổ sung chi tiết sau." },
    relatedTopicIds: ["them-quan-he-ro-rang"], reviewedAt: "2026-07-11",
  },
  {
    id: "them-quan-he-ro-rang", aliases: ["them-nguoi-than", "duong-net-lien-va-net-dut"], version: 1, status: "active", roles: ["owner", "editor"],
    title: "Thêm một quan hệ rõ ràng", summary: "Nối cha, mẹ, vợ/chồng hoặc con để hệ thống hiểu đường quan hệ.",
    purpose: "Các quan hệ cha–con, mẹ–con và vợ chồng giúp hệ thống tính cách xưng hô.",
    prerequisites: ["Cây có ít nhất một người.", "Bạn có quyền chỉnh sửa cây."],
    steps: ["Chọn một người trên sơ đồ.", "Chọn Thêm người thân.", "Chọn quan hệ phù hợp rồi lưu."],
    success: "Một đường nối mới xuất hiện trên sơ đồ.",
    recovery: "Nếu chưa biết người trung gian, bạn có thể dùng quan hệ khai báo. Đường nét đứt giữ nguyên cách gọi bạn nhập và không được dùng để tự tính đường họ hàng.",
    excerpts: { checklist: "Thêm cha, mẹ, vợ/chồng hoặc con để hệ thống hiểu đường quan hệ.", contextual: "Chọn quan hệ gần và rõ nhất. Quan hệ này giúp hệ thống tính cách xưng hô." },
    relatedTopicIds: ["xem-thong-tin-va-xung-ho"], reviewedAt: "2026-07-11",
  },
  {
    id: "xem-thong-tin-va-xung-ho", aliases: ["cach-tinh-xung-ho"], version: 1, status: "active", roles: ALL_ROLES,
    title: "Xem thông tin và cách xưng hô", summary: "Chọn một người để xem thông tin và cách gọi từ điểm nhìn hiện tại.",
    purpose: "Hiểu một người là ai và nên xưng hô thế nào trong cây.",
    prerequisites: ["Cây có ít nhất một người."],
    steps: ["Chọn một người trên sơ đồ.", "Xem phần thông tin ở cạnh màn hình."],
    success: "Phần thông tin hiển thị cách xưng hô, hoặc báo chưa xác định khi dữ liệu chưa đủ.",
    recovery: "Nếu chưa xác định, hãy kiểm tra các quan hệ nối giữa hai người hoặc thử một điểm nhìn khác.",
    excerpts: { checklist: "Mở thông tin của một người trên sơ đồ.", contextual: "Chọn một người để xem thông tin và cách xưng hô." },
    relatedTopicIds: ["doi-diem-nhin"], reviewedAt: "2026-07-11",
  },
  {
    id: "doi-diem-nhin", version: 1, status: "active", roles: ALL_ROLES,
    title: "Đổi điểm nhìn", summary: "Xem cách xưng hô khi nhìn từ một người khác trong cây.",
    purpose: "Cách gọi thay đổi theo người đang được chọn làm điểm nhìn.",
    prerequisites: ["Cây có ít nhất hai người."],
    steps: ["Mở bộ chọn Điểm nhìn.", "Chọn một người khác.", "Đợi cách xưng hô được cập nhật."],
    success: "Cách xưng hô trên sơ đồ được tính lại từ người vừa chọn.", recovery: "Nếu chưa thấy kết quả, đợi tải xong hoặc kiểm tra đường quan hệ giữa các thành viên.",
    excerpts: { checklist: "Xem cách xưng hô thay đổi khi nhìn từ một người khác.", contextual: "Đổi điểm nhìn để xem cách gọi trong gia đình thay đổi thế nào." },
    relatedTopicIds: ["xem-thong-tin-va-xung-ho"], reviewedAt: "2026-07-11",
  },
  {
    id: "dieu-huong-so-do", aliases: ["tim-duong-di"], version: 1, status: "active", roles: ALL_ROLES,
    title: "Di chuyển và tìm người trên sơ đồ", summary: "Kéo, thu phóng và tìm nhanh một người thân.",
    purpose: "Khám phá cây mà không làm thay đổi dữ liệu.", prerequisites: ["Cây đã có thành viên."],
    steps: ["Kéo vùng trống để di chuyển.", "Dùng nút thu phóng hoặc cuộn chuột; trên màn hình cảm ứng, dùng hai ngón tay.", "Dùng ô tìm kiếm để tới một người nhanh hơn."],
    success: "Người hoặc nhánh bạn cần xem nằm trong vùng hiển thị.", recovery: "Dùng nút đưa sơ đồ về vùng đang xem nếu bạn bị lạc.",
    excerpts: { contextual: "Kéo vùng trống để di chuyển. Bạn cũng có thể dùng các nút thu phóng; không cần nhớ thao tác bằng cử chỉ." },
    relatedTopicIds: ["xem-thong-tin-va-xung-ho"], reviewedAt: "2026-07-11",
  },
  {
    id: "doc-duong-quan-he", version: 1, status: "active", roles: ALL_ROLES,
    title: "Đọc đường quan hệ", summary: "Phân biệt đường quan hệ rõ ràng và quan hệ được khai báo.",
    purpose: "Hiểu ý nghĩa của các kiểu đường nối trên sơ đồ.", prerequisites: ["Cây có quan hệ giữa các thành viên."],
    steps: ["Mở Chú thích trên sơ đồ.", "Đường liền là quan hệ hệ thống có thể dùng để tính xưng hô.", "Đường nét đứt là cách gọi được khai báo khi chưa đủ người trung gian."],
    success: "Bạn nhận biết được vì sao một cách xưng hô có thể hoặc chưa thể tự tính.", recovery: "Bổ sung các quan hệ cha, mẹ, vợ/chồng hoặc con còn thiếu khi có đủ thông tin.",
    excerpts: {}, relatedTopicIds: ["them-quan-he-ro-rang"], reviewedAt: "2026-07-11",
  },
  {
    id: "chon-vung-mien", aliases: ["chon-vung-mien-va-bao-mat"], version: 1, status: "active", roles: ["owner"],
    title: "Chọn vùng miền", summary: "Dùng cách gọi phù hợp với gia đình ở miền Bắc, Trung hoặc Nam.",
    purpose: "Điều chỉnh từ xưng hô mà hệ thống hiển thị.", prerequisites: ["Bạn là chủ cây."],
    steps: ["Mở Cài đặt cây.", "Chọn vùng miền.", "Lưu thay đổi."], success: "Cách xưng hô được cập nhật theo vùng đã chọn.",
    recovery: "Nếu chưa cập nhật, thử tải lại cây sau khi lưu.", excerpts: {}, relatedTopicIds: ["doi-diem-nhin"], reviewedAt: "2026-07-11",
  },
  {
    id: "dieu-chinh-hien-thi", aliases: ["ca-nhan-hoa-giao-dien"], version: 1, status: "active", roles: ALL_ROLES,
    title: "Điều chỉnh để dễ đọc", summary: "Tăng cỡ chữ và dùng chế độ hiển thị phù hợp với mắt của bạn.",
    purpose: "Giúp mọi thành viên trong gia đình đọc và thao tác thoải mái hơn.", prerequisites: [],
    steps: ["Mở điều khiển cỡ chữ.", "Chọn mức từ 100% đến 200%."], success: "Chữ thay đổi nhưng nội dung và nút thao tác vẫn đầy đủ.",
    recovery: "Nếu màn hình chật, cuộn theo chiều dọc; không cần thu nhỏ chữ để tiếp tục.", excerpts: {}, relatedTopicIds: [], reviewedAt: "2026-07-11",
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
