"use client";

import { useState, type DragEvent, type FormEvent } from "react";
import { useSession } from "@/app/providers";
import { ApiError, api } from "@/lib/apiClient";
import { MoneyIcon } from "@/components/ui/Icons";
import { Button } from "@/components/Button";

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

const MAX_FEEDBACK_IMAGES = 3;
const MAX_FEEDBACK_IMAGE_BYTES = 2 * 1024 * 1024;

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Không thể đọc ảnh đính kèm."));
    reader.readAsDataURL(file);
  });
}

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
  const [attachments, setAttachments] = useState<File[]>([]);
  const [isDraggingAttachments, setIsDraggingAttachments] = useState(false);
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [error, setError] = useState("");

  function handleAttachmentFiles(files: File[]) {
    setError("");
    if (files.length === 0) {
      setAttachments([]);
      return;
    }

    const next = files.slice(0, MAX_FEEDBACK_IMAGES);
    const invalid = next.find((file) => !["image/jpeg", "image/png"].includes(file.type));
    if (invalid) {
      setAttachments([]);
      setStatus("error");
      setError("Chỉ hỗ trợ ảnh PNG hoặc JPEG.");
      return;
    }

    const oversized = next.find((file) => file.size > MAX_FEEDBACK_IMAGE_BYTES);
    if (oversized) {
      setAttachments([]);
      setStatus("error");
      setError("Mỗi ảnh feedback tối đa 2MB.");
      return;
    }

    setStatus("idle");
    setAttachments(next);
  }

  function handleAttachmentChange(files: FileList | null) {
    handleAttachmentFiles(files ? Array.from(files) : []);
  }

  function handleAttachmentDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setIsDraggingAttachments(false);
    handleAttachmentFiles(Array.from(event.dataTransfer.files));
  }

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
      const encodedAttachments = await Promise.all(
        attachments.map(async (file) => ({
          name: file.name,
          dataUrl: await readFileAsDataUrl(file),
        })),
      );
      await api.post("/feedback", { email, category, message, attachments: encodedAttachments });
      setMessage("");
      setAttachments([]);
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
          Không có sản phẩm nào hoàn hảo ngay từ đầu. Mỗi phản hồi của bạn giúp
          Cây Gia Phả nhận ra điều cần cải thiện và phục vụ mọi người tốt hơn.
          Hiện tại dự án được một mình admin xây dựng và kiểm thử, nên đôi khi
          vẫn có thể còn thiếu sót hoặc phát sinh lỗi trong quá trình sử dụng.
          Những góp ý, báo lỗi và đề xuất của bạn sẽ giúp admin có thêm thông
          tin để nâng cấp hệ thống. Xin chân thành cảm ơn bạn đã tin tưởng sử
          dụng và dành thời gian phản hồi!
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
            className="support-feedback__message"
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

        <div className="field">
          <label htmlFor="feedback-attachments">Ảnh minh họa</label>
          <input
            id="feedback-attachments"
            type="file"
            accept="image/png,image/jpeg"
            multiple
            className="support-feedback__attachment-input"
            onChange={(event) => handleAttachmentChange(event.target.files)}
          />
          <label
            htmlFor="feedback-attachments"
            className={`support-feedback__upload-zone${isDraggingAttachments ? " support-feedback__upload-zone--dragging" : ""}`}
            onDragEnter={(event) => {
              event.preventDefault();
              setIsDraggingAttachments(true);
            }}
            onDragOver={(event) => {
              event.preventDefault();
              event.dataTransfer.dropEffect = "copy";
            }}
            onDragLeave={() => setIsDraggingAttachments(false)}
            onDrop={handleAttachmentDrop}
          >
            <span className="support-feedback__upload-icon" aria-hidden="true">📤</span>
            <span className="support-feedback__upload-title">
              {attachments.length > 0 ? `${attachments.length} ảnh đã được chọn` : "Kéo thả ảnh vào đây"}
            </span>
            <span className="support-feedback__upload-subtitle">hoặc click để chọn ảnh PNG, JPEG</span>
          </label>
          <p className="field-hint">Tối đa 3 ảnh, mỗi ảnh 2MB. Không bắt buộc.</p>
          {attachments.length > 0 ? (
            <ul className="support-feedback__attachment-list" aria-label="Ảnh feedback đã chọn">
              {attachments.map((file) => (
                <li key={`${file.name}-${file.size}`}>{file.name}</li>
              ))}
            </ul>
          ) : null}
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

        <Button type="submit" loading={status === "submitting"} loadingLabel="Đang gửi feedback…">
          Gửi feedback
        </Button>
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
