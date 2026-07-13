"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  CheckCircleIcon,
  CloseIcon,
  ErrorIcon,
  InfoIcon,
} from "@/components/ui/Icons";
import type { CGPToastApi, CGPToastOptions } from "./contracts";
import { CGPButton, CGPIconButton } from "./Button";

interface CGPToastRecord {
  id: number;
  message: string;
  options: Required<Pick<CGPToastOptions, "tone">> &
    Pick<CGPToastOptions, "action">;
}

const CGPToastContext = createContext<CGPToastApi | undefined>(undefined);

function defaultTimeout(message: string): number {
  // Preserve the legacy reading allowance for long invitation/reminder copy.
  return message.length > 80 ? 7000 : 4000;
}

function ToastToneIcon({ tone }: { tone: NonNullable<CGPToastOptions["tone"]> }) {
  if (tone === "success") return <CheckCircleIcon size={20} />;
  if (tone === "error") return <ErrorIcon size={20} />;
  if (tone === "info") return <InfoIcon size={20} />;
  return null;
}

export function CGPToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<CGPToastRecord[]>([]);
  const nextId = useRef(0);
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>());

  const remove = useCallback((id: number) => {
    const timer = timers.current.get(id);
    if (timer !== undefined) clearTimeout(timer);
    timers.current.delete(id);
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const show = useCallback<CGPToastApi["show"]>(
    (message, options = {}) => {
      const id = ++nextId.current;
      const tone = options.tone ?? "info";
      const timeout =
        options.timeout === undefined ? defaultTimeout(message) : options.timeout;

      setToasts((current) => [
        ...current,
        { id, message, options: { tone, action: options.action } },
      ]);

      if (timeout !== null) {
        timers.current.set(id, setTimeout(() => remove(id), timeout));
      }

      return () => remove(id);
    },
    [remove],
  );

  useEffect(
    () => () => {
      timers.current.forEach((timer) => clearTimeout(timer));
      timers.current.clear();
    },
    [],
  );

  const api = useMemo<CGPToastApi>(() => ({ show }), [show]);

  return (
    <CGPToastContext.Provider value={api}>
      {children}
      <section
        aria-label="Thông báo"
        className="cgp-toast-region"
        role="region"
      >
        {toasts.map(({ id, message, options }) => (
          <div
            aria-atomic="true"
            className={`cgp-toast cgp-toast--${options.tone}`}
            key={id}
            role="alert"
          >
            {options.tone !== "neutral" ? (
              <span aria-hidden="true" className="cgp-toast__icon">
                <ToastToneIcon tone={options.tone} />
              </span>
            ) : null}
            <span className="cgp-toast__message">{message}</span>
            {options.action ? (
              <CGPButton
                className="cgp-toast__action"
                onPress={() => {
                  options.action?.onAction();
                  if (options.action?.closeOnAction !== false) remove(id);
                }}
                size="sm"
                variant="link"
              >
                {options.action.label}
              </CGPButton>
            ) : null}
            <CGPIconButton
              aria-label="Đóng thông báo"
              className="cgp-toast__close"
              onPress={() => remove(id)}
              size="sm"
              variant="quiet"
            >
              <CloseIcon size={16} />
            </CGPIconButton>
          </div>
        ))}
      </section>
    </CGPToastContext.Provider>
  );
}

export function useCGPToast(): CGPToastApi {
  const context = useContext(CGPToastContext);
  if (!context) {
    throw new Error("useCGPToast must be used within CGPToastProvider");
  }
  return context;
}
