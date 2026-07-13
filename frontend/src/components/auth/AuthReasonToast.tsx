"use client";

import { useEffect, useRef } from "react";
import { useCGPToast } from "@/components/cgp";

export function AuthReasonToast({ reason }: { reason?: string }) {
  const { show } = useCGPToast();
  const shown = useRef(false);

  useEffect(() => {
    if (reason === "invitation" && !shown.current) {
      shown.current = true;
      show("Bạn cần đăng nhập trước khi yêu cầu vào cây", { tone: "info" });
    }
  }, [reason, show]);

  return null;
}
