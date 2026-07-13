"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CGPDialog } from "@/components/cgp";
import { getCookie, setCookie } from "@/lib/cookies";

export const EARLY_ACCESS_WELCOME_COOKIE = "cgp_early_access_welcome_v1";
export const EARLY_ACCESS_WELCOME_COOKIE_VALUE = "acknowledged";

interface EarlyAccessWelcomeDialogProps {
  forceOpen?: boolean;
  persistAcknowledgement?: boolean;
}

export function EarlyAccessWelcomeDialog({
  forceOpen = false,
  persistAcknowledgement = true,
}: EarlyAccessWelcomeDialogProps) {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    let hasAcknowledged = false;

    try {
      hasAcknowledged =
        getCookie(EARLY_ACCESS_WELCOME_COOKIE) ===
        EARLY_ACCESS_WELCOME_COOKIE_VALUE;
    } catch {
      // If cookie access is blocked, show the message once for this page visit.
    }

    setIsOpen(forceOpen || !hasAcknowledged);
  }, [forceOpen]);

  const acknowledgeAndClose = () => {
    if (persistAcknowledgement) {
      try {
        setCookie(
          EARLY_ACCESS_WELCOME_COOKIE,
          EARLY_ACCESS_WELCOME_COOKIE_VALUE,
          365,
        );
      } catch {
        // Closing must still work when the browser refuses cookie writes.
      }
    }

    setIsOpen(false);
  };

  return (
    <CGPDialog
      isOpen={isOpen}
      onOpenChange={(nextIsOpen) => {
        if (!nextIsOpen) acknowledgeAndClose();
      }}
      title="Chào mừng bạn đến với phiên bản truy cập sớm của Cây Gia Phả!"
      size="md"
      className="early-access-welcome-dialog"
      footer={
        <button
          type="button"
          className="btn btn-primary btn-terracotta"
          onClick={acknowledgeAndClose}
        >
          Tôi đã hiểu
        </button>
      }
    >
      <div className="early-access-welcome-dialog__content">
        <p>
          Cây Gia Phả giúp bạn tạo và cùng người thân xây dựng sơ đồ gia đình,
          lưu giữ thông tin và ảnh kỷ niệm, đồng thời xem cách xưng hô tiếng Việt
          theo Bắc, Trung, Nam. Trong giai đoạn truy cập sớm, toàn bộ tính năng
          hiện có được mở miễn phí để mọi người trải nghiệm.
        </p>
        <p>
          Vì hệ thống vẫn đang trong quá trình phát triển, trang web có thể còn
          lỗi hoặc thiếu sót. Để góp phần cải thiện, bạn có thể gửi phản hồi qua
          trang{" "}
          <Link href="/feedback" onClick={acknowledgeAndClose}>
            Feedback
          </Link>
          .
        </p>
        <p>
          Nếu thấy trang web hữu ích, bạn có thể mời nhà phát triển{" "}
          <Link href="/support" onClick={acknowledgeAndClose}>
            một vài ly cà phê
          </Link>{" "}
          để góp phần duy trì và tiếp tục phát triển website. Xin cảm ơn bạn rất
          nhiều!
        </p>
      </div>
    </CGPDialog>
  );
}
