"use client";

import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect } from "react";
import { CheckCircleIcon, ErrorIcon, InfoIcon, CloseIcon } from "@/components/ui/Icons";
import { Card } from "@/components/ui/Card";

export type ToastType = "success" | "error" | "info";

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: ToastType = "info") => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);

    // Longer messages (invite + spam reminder) need more time to read.
    const duration = message.length > 80 ? 7000 : 4000;
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, duration);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div
        style={{
          position: "fixed",
          bottom: "1.5rem",
          right: "1.5rem",
          display: "flex",
          flexDirection: "column",
          gap: "0.5rem",
          zIndex: 9999,
          pointerEvents: "none",
        }}
      >
        {toasts.map((toast) => (
          <Card
            key={toast.id}
            role="alert"
            style={{
              pointerEvents: "auto",
              display: "flex",
              alignItems: "center",
              gap: "0.75rem",
              padding: "1rem",
              border: `1px solid ${
                toast.type === "error" ? "var(--color-danger)" :
                toast.type === "success" ? "#10b981" : "var(--color-hairline)"
              }`,
              boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
              color: "var(--color-fg)",
              minWidth: "250px",
              maxWidth: "400px",
              animation: "slideIn 0.3s ease-out forwards",
            }}
          >
            {toast.type === "success" && <span style={{ color: "#10b981" }}><CheckCircleIcon size={20} /></span>}
            {toast.type === "error" && <span style={{ color: "var(--color-danger)" }}><ErrorIcon size={20} /></span>}
            {toast.type === "info" && <span style={{ color: "var(--color-brand)" }}><InfoIcon size={20} /></span>}
            
            <span style={{ flex: 1, fontSize: "0.9rem", lineHeight: 1.4 }}>{toast.message}</span>
            
            <button
              onClick={() => removeToast(toast.id)}
              style={{
                background: "none",
                border: "none",
                color: "var(--color-muted)",
                cursor: "pointer",
                padding: "0.25rem",
                marginRight: "-0.25rem",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: "50%",
              }}
              onMouseOver={(e) => (e.currentTarget.style.backgroundColor = "var(--color-hairline-soft)")}
              onMouseOut={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
              aria-label="Đóng thông báo"
            >
              <CloseIcon size={16} />
            </button>
          </Card>
        ))}
      </div>
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return ctx;
}
