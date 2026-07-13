"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "@/app/providers";
import { api } from "@/lib/apiClient";
import { CGPCheckbox, CGPDialog } from "@/components/cgp";

export function ConsentReacceptanceDialog({
  acknowledge,
}: {
  acknowledge?: () => Promise<void>;
} = {}) {
  const { user, refresh } = useSession();
  const [accepted, setAccepted] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.consentRequired) {
      setAccepted(false);
      setDismissed(false);
      setError(null);
    }
  }, [user?.consentRequired]);

  const isOpen = Boolean(user?.consentRequired && !dismissed);

  async function confirm() {
    if (!accepted || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      if (acknowledge) {
        await acknowledge();
      } else {
        await api.post("/me/consent", {
          acceptedTos: true,
          acceptedPrivacy: true,
        });
      }
      setDismissed(true);
      await refresh();
    } catch {
      setError("Không thể ghi nhận lựa chọn lúc này. Vui lòng thử lại.");
    } finally {
      setSubmitting(false);
    }
  }

  if (user?.consentRequired && dismissed) {
    return (
      <aside className="consent-reacceptance-reminder" role="status">
        <span>Bạn cần chấp thuận điều khoản hiện tại trước khi thay đổi dữ liệu.</span>
        <button type="button" className="btn btn-secondary" onClick={() => setDismissed(false)}>
          Xem lại điều khoản cập nhật
        </button>
      </aside>
    );
  }

  return (
    <CGPDialog
      isOpen={isOpen}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) setDismissed(true);
      }}
      title="Điều khoản và chính sách đã được cập nhật"
      description="Vui lòng xem và chấp thuận phiên bản hiện tại để tiếp tục thay đổi dữ liệu."
      size="md"
      className="consent-reacceptance-dialog"
      footer={
        <button
          type="button"
          className="btn btn-primary btn-terracotta"
          disabled={!accepted || submitting}
          onClick={() => void confirm()}
        >
          {submitting ? "Đang ghi nhận…" : "Đồng ý và tiếp tục"}
        </button>
      }
    >
      <div className="consent-reacceptance-dialog__content">
        <p>
          Phiên bản mới làm rõ cách đăng nhập, các vai trò trong cây, chế độ chia sẻ,
          dữ liệu gia phả và ảnh, cùng quyền truy cập, chỉnh sửa hoặc xóa dữ liệu.
        </p>
        <p>
          Đọc <Link href="/legal/tos" target="_blank">Điều khoản dịch vụ</Link> và{" "}
          <Link href="/legal/privacy" target="_blank">Chính sách quyền riêng tư</Link>.
        </p>
        <CGPCheckbox isSelected={accepted} onChange={setAccepted}>
          Tôi đã đọc và đồng ý với Điều khoản dịch vụ và Chính sách quyền riêng tư hiện tại.
        </CGPCheckbox>
        {error ? <p role="alert" className="form-error">{error}</p> : null}
      </div>
    </CGPDialog>
  );
}
