"use client";

import React, { createContext, useContext, useState, useCallback, ReactNode } from "react";

interface ConfirmOptions {
  title: string;
  message: ReactNode;
  confirmText?: string;
  cancelText?: string;
  destructive?: boolean;
}

interface ConfirmContextValue {
  requestConfirm: (options: ConfirmOptions) => Promise<boolean>;
}

const ConfirmContext = createContext<ConfirmContextValue | undefined>(undefined);

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const [resolvePromise, setResolvePromise] = useState<((value: boolean) => void) | null>(null);

  const requestConfirm = useCallback((opts: ConfirmOptions) => {
    setOptions(opts);
    setIsOpen(true);
    return new Promise<boolean>((resolve) => {
      setResolvePromise(() => resolve);
    });
  }, []);

  const handleConfirm = useCallback(() => {
    setIsOpen(false);
    if (resolvePromise) resolvePromise(true);
  }, [resolvePromise]);

  const handleCancel = useCallback(() => {
    setIsOpen(false);
    if (resolvePromise) resolvePromise(false);
  }, [resolvePromise]);

  return (
    <ConfirmContext.Provider value={{ requestConfirm }}>
      {children}
      {isOpen && options && (
        <div
          style={{
            position: "fixed",
            top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.4)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 10000,
          }}
          onClick={handleCancel}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-dialog-title"
            style={{
              backgroundColor: "var(--color-surface)",
              padding: "1.5rem",
              borderRadius: "12px",
              boxShadow: "0 10px 25px rgba(0, 0, 0, 0.15)",
              maxWidth: "400px",
              width: "100%",
              margin: "0 1rem",
              border: "1px solid var(--color-hairline)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="confirm-dialog-title" style={{ fontSize: "1.25rem", fontWeight: 600, color: "var(--color-fg)", margin: "0 0 0.75rem 0" }}>
              {options.title}
            </h2>
            <div style={{ color: "var(--color-muted)", fontSize: "0.95rem", lineHeight: 1.5, marginBottom: "1.5rem" }}>
              {options.message}
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem" }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleCancel}
                style={{ minWidth: "80px" }}
              >
                {options.cancelText || "Hủy"}
              </button>
              <button
                type="button"
                className={`btn ${options.destructive ? "btn-secondary" : "btn-primary btn-terracotta"}`}
                onClick={handleConfirm}
                style={options.destructive ? { borderColor: "var(--color-danger)", color: "var(--color-danger)", minWidth: "80px" } : { minWidth: "80px" }}
              >
                {options.confirmText || "Đồng ý"}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) {
    throw new Error("useConfirm must be used within ConfirmProvider");
  }
  return ctx;
}
