"use client";

import { useState, type FormEvent } from "react";
import { useSession } from "@/app/providers";
import { ApiError, api } from "@/lib/apiClient";
import { MoneyIcon } from "@/components/ui/Icons";

interface SupportFeedbackSectionProps {
  prototype?: boolean;
  mockEmail?: string;
}

interface SupportSectionProps {
  plain?: boolean;
}

const CATEGORY_OPTIONS = [
  { value: "bug", label: "Lỗi" },
  { value: "feature", label: "Tính năng" },
  { value: "other", label: "Khác" },
];

export function SupportSection({ plain = false }: SupportSectionProps) {
  return (
    <div className={`support-feedback__support${plain ? " support-feedback__support--plain" : ""}`}>
      {!plain && <div className="support-feedback__glow" aria-hidden="true" />}
      <div className="support-feedback__copy">
        <div className="support-feedback__mark" aria-hidden="true">
          <MoneyIcon size={36} />
        </div>
        <p className="support-feedback__eyebrow">Ủng hộ dự án</p>
        <h1 id="support-title">Miễn phí trải nghiệm trong giai đoạn đầu</h1>
        <p>
          Cây Gia Phả sẽ miễn phí trong thời gian đầu để mọi người dùng thử,
          góp ý và cùng hoàn thiện. Nếu thấy hữu ích, mọi người có thể ủng hộ
          Nhà phát triển để dự án tiếp tục được cải thiện trong tương lai.
        </p>
        <p>
          Hiện tại NPT đang sử dụng các nền tảng miễn phí để phát triển website
          này, do vậy trong quá trình sử dụng có thể sẽ dẫn đến lỗi, lag,...
          không mong muốn. Vì vậy, sự đóng góp của mọi người cũng giúp NPT có
          thêm kinh phí để nâng cấp hệ thống và trải nghiệm của mọi người :3.
        </p>
        <p>
          Và đừng ngần ngại chia sẻ cho bạn bè, người thân hoặc các cô chú trong
          dòng họ để nhiều người cùng dùng và góp ý hơn giúp NPT nhé. Xin cảm
          ơn mọi người!
        </p>
      </div>

      <div className="support-feedback__qr-card" aria-label="Mã QR ủng hộ Nhà phát triển">
        <img src="/support-qr.png" alt="Mã QR BIDV VietQR ủng hộ Nhà phát triển Hàng Nhựt Long" />
      </div>
    </div>
  );
}

export function FeedbackSection({
  prototype = false,
  mockEmail,
}: SupportFeedbackSectionProps) {
  const { user } = useSession();
  const [email, setEmail] = useState(mockEmail || (user?.identifier.includes("@") ? user.identifier : ""));
  const [category, setCategory] = useState("feature");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("submitting");
    setError("");

    if (prototype) {
      await new Promise((resolve) => setTimeout(resolve, 250));
      setMessage("");
      setStatus("success");
      return;
    }

    try {
      await api.post("/feedback", { email, category, message });
      setMessage("");
      setStatus("success");
    } catch (err) {
      setStatus("error");
      setError(err instanceof ApiError ? err.message : "Không thể gửi feedback lúc này.");
    }
  }

  return (
    <div className="support-feedback__feedback" aria-labelledby="feedback-title">
      <div>
        <p className="support-feedback__eyebrow">Gửi góp ý</p>
        <h1 id="feedback-title">Feedback giúp sản phẩm tốt hơn</h1>
        <p>
          Báo lỗi, đề xuất tính năng hoặc góp ý trải nghiệm. Nội dung sẽ được
          gửi đến admin để theo dõi và xử lý.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="support-feedback__form">
        <div className="field">
          <label htmlFor="feedback-email">Email của bạn</label>
          <input
            id="feedback-email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="ban@example.com"
            required
          />
        </div>

        <div className="field">
          <label htmlFor="feedback-category">Phân loại</label>
          <select
            id="feedback-category"
            value={category}
            onChange={(event) => setCategory(event.target.value)}
          >
            {CATEGORY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="field">
          <label htmlFor="feedback-message">Nội dung</label>
          <textarea
            id="feedback-message"
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            minLength={10}
            maxLength={4000}
            rows={5}
            placeholder="Mình gặp lỗi khi..., hoặc mình muốn có thêm..."
            required
          />
        </div>

        {status === "success" && (
          <p className="form-message form-message--success" role="status">
            Đã gửi feedback. Cảm ơn bạn đã giúp Cây Gia Phả tốt hơn.
          </p>
        )}
        {status === "error" && (
          <p className="field-error" role="alert">
            {error}
          </p>
        )}

        <button type="submit" className="btn" disabled={status === "submitting"}>
          {status === "submitting" ? "Đang gửi..." : "Gửi feedback"}
        </button>
      </form>
    </div>
  );
}

export function SupportFeedbackSection(props: SupportFeedbackSectionProps) {
  return (
    <section className="support-feedback" aria-labelledby="support-title">
      <SupportSection />
      <FeedbackSection {...props} />
    </section>
  );
}
