"use client";

import React, { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { CGPButton, CGPDialog } from "@/components/cgp";

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
        <CGPDialog
          isOpen
          onOpenChange={(nextIsOpen) => {
            if (!nextIsOpen) handleCancel();
          }}
          title={options.title}
          size="sm"
          className="cgp-confirm-dialog"
          footer={
            <>
              <CGPButton type="button" variant="secondary" onPress={handleCancel}>
                {options.cancelText || "Hủy"}
              </CGPButton>
              <CGPButton
                type="button"
                variant={options.destructive ? "danger" : "primary"}
                onPress={handleConfirm}
              >
                {options.confirmText || "Đồng ý"}
              </CGPButton>
            </>
          }
        >
          <div className="cgp-confirm-dialog__message">{options.message}</div>
        </CGPDialog>
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
