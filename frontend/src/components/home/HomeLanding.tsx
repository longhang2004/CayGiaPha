import Link from "next/link";
import { HomeFaqItem } from "./HomeFaqItem";
import { HomeScrollReveal } from "./HomeScrollReveal";

export type HomeLandingState = "loading" | "signed-out" | "signed-in";

export interface HomeLandingProps {
  state: HomeLandingState;
  animated?: boolean;
}

const faqItems = [
  {
    question: "Dùng Cây Gia Phả có mất phí không?",
    answer:
      "Hiện tại, Cây Gia Phả miễn phí trong giai đoạn truy cập sớm. Nếu chính sách này thay đổi, thông tin sẽ được cập nhật rõ ràng.",
  },
  {
    question: "Cây chưa đầy đủ thì có bắt đầu được không?",
    answer:
      "Có. Bạn có thể bắt đầu với một người và vài điều mình nhớ. Những chỗ còn thiếu có thể được bổ sung dần khi người thân cùng tham gia.",
  },
  {
    question: "Cách xưng hô được tính như thế nào?",
    answer:
      "Khi có đủ đường quan hệ trực tiếp, hệ thống tính cách gọi theo người được chọn để xét vai vế và vùng Bắc, Trung hoặc Nam. Nếu thiếu người trung gian, gia đình vẫn có thể lưu tên gọi tự khai báo.",
  },
  {
    question: "Ai có thể chỉnh sửa thông tin trong cây?",
    answer:
      "Mỗi tài khoản chỉ thấy những thao tác phù hợp với quyền hiện tại. Chủ cây quản lý việc cộng tác và chia sẻ, còn người được mời làm việc trong phạm vi được cấp.",
  },
  {
    question: "Thông tin của người còn sống được bảo vệ ra sao?",
    answer:
      "Chủ cây có thể bật chế độ bảo vệ người còn sống và chọn cách chia sẻ cây. Bạn nên chỉ lưu những thông tin mà người thân đồng ý chia sẻ.",
  },
  {
    question: "Tôi có thể xuất hoặc xóa dữ liệu không?",
    answer:
      "Có. Trong Cài đặt, mục Quyền dữ liệu cho phép xem các hồ sơ đã liên kết, xuất dữ liệu và gửi yêu cầu xóa phù hợp với tài khoản của bạn.",
  },
] as const;

function PrimaryHomeAction({ state }: { state: HomeLandingState }) {
  if (state === "loading") {
    return (
      <span className="btn btn-secondary home-landing__secondary-action home-landing__loading" aria-busy="true">
        Đang kiểm tra phiên đăng nhập…
      </span>
    );
  }

  return (
    <Link href={state === "signed-in" ? "/tree" : "/signup"} className="btn home-landing__primary-action">
      {state === "signed-in" ? "Mở cây gia phả" : "Tạo cây gia phả"}
    </Link>
  );
}

function LineageVisual() {
  return (
    <div className="home-story-visual home-story-visual--lineage" aria-hidden="true">
      <svg
        className="home-story-lineage__connector"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
      >
        <path d="M50 24V39H30M50 39H72M30 39V49M72 39V49M30 65V76" />
      </svg>
      <span className="home-story-node home-story-node--grandparent">Ông bà</span>
      <span className="home-story-node home-story-node--parent-a">Cha mẹ</span>
      <span className="home-story-node home-story-node--parent-b">Cô chú</span>
      <span className="home-story-node home-story-node--child">Bạn</span>
    </div>
  );
}

function KinshipVisual() {
  return (
    <div className="home-story-visual home-story-visual--kinship" aria-hidden="true">
      <div className="home-kinship-person">
        <span className="home-kinship-avatar">L</span>
        <strong>Lan</strong>
      </div>
      <span className="home-kinship-connector" />
      <div className="home-kinship-callout">
        <span>Gọi là</span>
        <strong>Bà ngoại</strong>
      </div>
    </div>
  );
}

function MemoryVisual() {
  return (
    <div className="home-story-visual home-story-visual--memory" aria-hidden="true">
      <span className="home-memory-frame home-memory-frame--back" />
      <span className="home-memory-frame home-memory-frame--front">
        <span className="home-memory-sun" />
        <span className="home-memory-hills" />
      </span>
      <span className="home-memory-caption">Một buổi sum họp</span>
    </div>
  );
}

function AccessVisual() {
  return (
    <div className="home-story-visual home-story-visual--access" aria-hidden="true">
      <span><strong>Chủ cây</strong><small>Quản lý cây</small></span>
      <span><strong>Cộng tác</strong><small>Bổ sung thông tin</small></span>
      <span><strong>Chỉ xem</strong><small>Đọc cây được chia sẻ</small></span>
    </div>
  );
}

export function HomeLanding({ state, animated = true }: HomeLandingProps) {
  return (
    <HomeScrollReveal enabled={animated}>
      <main className="home-landing__main">
      <section className="home-landing__hero" aria-labelledby="home-title">
        <img
          src="/home-heritage-family.jpg"
          alt="Gia đình Việt nhiều thế hệ quây quần trong sân nhà"
          className="home-landing__hero-image"
          width="1200"
          height="630"
        />
        <div className="home-landing__hero-wash" aria-hidden="true" />
        <div className="home-landing__hero-content home-reveal">
          <p className="home-section__eyebrow">Gia phả cho ông bà và con cháu</p>
          <h1 id="home-title">Ghi lại gia đình để cả nhà cùng nhớ</h1>
          <p>
            Bắt đầu với một người bạn còn nhớ rõ. Phần còn lại có thể bổ sung sau.
          </p>
          <div className="home-landing__hero-actions" aria-live="polite">
            <PrimaryHomeAction state={state} />
            <Link
              href="#cach-hoat-dong"
              className="btn btn-secondary home-landing__learn-action"
            >
              Xem cách hoạt động
            </Link>
          </div>
        </div>
      </section>

      <div className="home-value-strip" aria-label="Những điều gia đình có thể lưu trong một cây">
        <span>Thành viên và quan hệ</span>
        <span>Cách xưng hô theo người được chọn</span>
        <span>Ảnh và câu chuyện</span>
        <span>Quyền xem và cộng tác</span>
      </div>

      <section className="home-section home-problem home-reveal" aria-labelledby="home-problem-title">
        <div className="home-section__heading">
          <p className="home-section__eyebrow">Những điều dễ bị thất lạc</p>
          <h2 id="home-problem-title">Một nơi để gia đình cùng nhớ</h2>
          <p>
            Tên một người cô, tấm ảnh cũ hay cách gọi trong nhà thường nằm rải rác ở nhiều người. Cây Gia Phả giúp đưa chúng về cùng một chỗ để cả nhà có thể xem và bổ sung.
          </p>
        </div>
        <div className="home-problem__notes" aria-label="Những điều có thể bắt đầu ngay">
          <article>
            <strong>Bắt đầu khi thông tin còn thiếu</strong>
            <p>Ghi điều bạn biết trước. Phần còn thiếu có thể để người thân bổ sung sau.</p>
          </article>
          <article>
            <strong>Mỗi người nhớ một phần</strong>
            <p>Mời đúng người trong gia đình cùng nối lại tên, ảnh và mối quan hệ.</p>
          </article>
        </div>
      </section>

      <section id="cach-hoat-dong" className="home-section home-how home-reveal" aria-label="Cách hoạt động">
        <div className="home-section__heading">
          <h2>Bắt đầu từ những điều bạn đang biết</h2>
          <p>Không cần chuẩn bị một bộ gia phả hoàn chỉnh. Chỉ cần mở một nhánh đầu tiên.</p>
        </div>
        <ol className="home-how__list">
          <li>
            <strong>Ghi người đầu tiên</strong>
            <p>Bắt đầu với chính bạn, một người lớn tuổi hoặc người đang giữ nhiều thông tin gia đình.</p>
          </li>
          <li>
            <strong>Nối từng mối quan hệ</strong>
            <p>Thêm cha, mẹ, vợ chồng và con để sơ đồ hình thành từ các quan hệ trực tiếp.</p>
          </li>
          <li>
            <strong>Mời người thân bổ sung</strong>
            <p>Chia sẻ quyền phù hợp để mỗi người góp thêm phần mình biết mà không phải gửi qua nhiều nơi.</p>
          </li>
        </ol>
      </section>

      <section id="tinh-nang" className="home-section home-features" aria-label="Tính năng">
        <div className="home-section__heading home-reveal">
          <p className="home-section__eyebrow">Bốn câu chuyện trong cùng một cây</p>
          <h2>Những việc một cây gia phả có thể giữ lại</h2>
          <p>Mỗi phần phục vụ một việc cụ thể, từ nhìn quan hệ đến cùng nhau sửa thông tin.</p>
        </div>

        <div className="home-feature-stories">
          <article className="home-feature-story home-feature-story--wide home-reveal">
            <div className="home-feature-story__copy">
              <h3>Nhìn cả gia đình trong một sơ đồ</h3>
              <p>Tìm một người, đổi người xét vai vế, kéo và thu phóng trong giới hạn để đọc từng nhánh mà không làm thay đổi dữ liệu.</p>
            </div>
            <LineageVisual />
          </article>

          <article className="home-feature-story home-feature-story--tall home-reveal">
            <div className="home-feature-story__copy">
              <h3>Tìm cách gọi theo người bạn chọn</h3>
              <p>Khi đường quan hệ đã đủ, cách xưng hô được tính lại theo người xét và vùng miền đang dùng.</p>
            </div>
            <KinshipVisual />
          </article>

          <article className="home-feature-story home-feature-story--memory home-reveal">
            <MemoryVisual />
            <div className="home-feature-story__copy">
              <h3>Giữ ảnh bên đúng người</h3>
              <p>Ảnh kỷ niệm nằm cùng hồ sơ người thân, để một cái tên có thêm khuôn mặt và câu chuyện.</p>
            </div>
          </article>

          <article className="home-feature-story home-feature-story--access home-reveal">
            <AccessVisual />
            <div className="home-feature-story__copy">
              <h3>Mỗi người làm việc trong phần được giao</h3>
              <p>Chủ cây quản lý cộng tác và chia sẻ. Mỗi người chỉ thấy những thao tác tài khoản hiện tại được phép dùng.</p>
            </div>
          </article>
        </div>
      </section>

      <section className="home-section home-kinship home-reveal" aria-labelledby="home-kinship-title">
        <div className="home-kinship__copy">
          <p className="home-section__eyebrow">Xưng hô Việt Nam</p>
          <h2 id="home-kinship-title">Cách gọi đúng với từng gia đình Việt</h2>
          <p>
            Cùng một người có thể là bác, cậu, dì hoặc cháu tùy người đang xét vai vế. Khi có đủ quan hệ trực tiếp, Cây Gia Phả tính lại cách gọi theo vùng Bắc, Trung hoặc Nam mà gia đình đã chọn.
          </p>
          <p>
            Với những nhánh chưa đủ người trung gian, bạn vẫn có thể ghi tên gọi tự khai báo để không làm mất thông tin đang có.
          </p>
        </div>
        <div className="home-kinship__constellation" aria-hidden="true">
          <span className="home-kinship__person home-kinship__person--one">Tôi</span>
          <span className="home-kinship__person home-kinship__person--two">Mẹ</span>
          <span className="home-kinship__person home-kinship__person--three">Dì</span>
          <span className="home-kinship__person home-kinship__person--four">Em họ</span>
          <span className="home-kinship__thread home-kinship__thread--one" />
          <span className="home-kinship__thread home-kinship__thread--two" />
          <span className="home-kinship__thread home-kinship__thread--three" />
        </div>
      </section>

      <section id="rieng-tu" className="home-section home-privacy home-reveal" aria-label="Riêng tư">
        <div className="home-privacy__mark" aria-hidden="true">
          <span />
        </div>
        <div className="home-privacy__copy">
          <h2>Riêng tư bắt đầu từ quyền kiểm soát</h2>
          <p>
            Chủ cây quyết định ai được vào cây và ai có thể chỉnh sửa. Họ cũng quản lý việc cộng tác, cách chia sẻ và chế độ bảo vệ thông tin của người còn sống.
          </p>
          <p>
            Mỗi thành viên vẫn nên hỏi ý kiến người thân trước khi lưu ảnh hoặc thông tin riêng tư.
          </p>
          <Link href="/legal/privacy">Đọc Chính sách quyền riêng tư</Link>
        </div>
      </section>

      <section className="home-section home-audiences home-reveal" aria-labelledby="home-audiences-title">
        <div className="home-section__heading">
          <h2 id="home-audiences-title">Mỗi người góp một phần khác nhau</h2>
          <p>Mỗi người có thể bắt đầu từ phần mình đang giữ, không cần cùng làm mọi việc.</p>
        </div>
        <div className="home-audiences__grid">
          <article>
            <h3>Người khởi tạo cây</h3>
            <p>Dựng nhánh đầu tiên, mời người thân và giữ cho thông tin được sắp xếp rõ ràng.</p>
          </article>
          <article>
            <h3>Người thân được mời</h3>
            <p>Xem lại quan hệ, bổ sung phần mình biết và giúp sửa những chỗ còn thiếu.</p>
          </article>
          <article>
            <h3>Người giữ ảnh và chuyện nhà</h3>
            <p>Đưa ảnh kỷ niệm về đúng người để những câu chuyện cũ không chỉ nằm trong một chiếc điện thoại.</p>
          </article>
        </div>
      </section>

      <section className="home-section home-faq" aria-label="Câu hỏi thường gặp">
        <div className="home-section__heading home-reveal">
          <p className="home-section__eyebrow">Trước khi bắt đầu</p>
          <h2>Câu hỏi thường gặp</h2>
        </div>
        <div className="home-faq__list">
          {faqItems.map((item) => (
            <HomeFaqItem key={item.question} {...item} />
          ))}
        </div>
      </section>

      <section className="home-closing home-reveal" aria-labelledby="home-closing-title">
        <div>
          <h2 id="home-closing-title">Bắt đầu với một người mà bạn còn nhớ rõ</h2>
          <p>Một cái tên là đủ để mở cây. Phần còn lại có thể lớn lên cùng gia đình.</p>
        </div>
        <PrimaryHomeAction state={state} />
      </section>
      </main>

      <footer className="home-footer">
        <div className="home-footer__brand">
          <Link href="/" aria-label="Cây Gia Phả">
            <img src="/logo.svg" alt="Logo Cây Gia Phả" width="154" height="24" />
          </Link>
          <p>Một nơi để gia đình cùng ghi lại người thân, quan hệ và những điều đáng nhớ.</p>
        </div>
        <nav className="home-footer__links" aria-label="Liên kết cuối trang">
          <div>
            <h2>Sản phẩm</h2>
            <Link href="/#cach-hoat-dong">Cách hoạt động</Link>
            <Link href="/#tinh-nang">Tính năng</Link>
            <Link href="/#rieng-tu">Riêng tư</Link>
          </div>
          <div>
            <h2>Hỗ trợ</h2>
            <Link href="/help">Hướng dẫn</Link>
            <Link href="/feedback">Feedback</Link>
            <Link href="/support">Ủng hộ</Link>
          </div>
          <div>
            <h2>Pháp lý</h2>
            <Link href="/legal/tos">Điều khoản dịch vụ</Link>
            <Link href="/legal/privacy">Chính sách quyền riêng tư</Link>
          </div>
        </nav>
        <p className="home-footer__copyright">© 2026 Cây Gia Phả</p>
      </footer>
    </HomeScrollReveal>
  );
}
