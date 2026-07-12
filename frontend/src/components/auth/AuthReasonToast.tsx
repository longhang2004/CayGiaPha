"use client";

import { useEffect, useRef } from "react";
import { useToast } from "@/components/ui/ToastProvider";

export function AuthReasonToast({ reason }: { reason?: string }) {
  const { showToast } = useToast();
  const shown = useRef(false);

  useEffect(() => {
    if (reason === "invitation" && !shown.current) {
      shown.current = true;
      showToast("Bạn cần đăng nhập trước khi yêu cầu vào cây", "info");
    }
  }, [reason, showToast]);

  return null;
}
