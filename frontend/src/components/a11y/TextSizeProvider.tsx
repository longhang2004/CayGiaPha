"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  DEFAULT_TEXT_SCALE,
  applyTextScale,
  clampTextScale,
  readStoredTextScale,
  storeTextScale,
} from "@/lib/textSize";

interface TextSizeContextValue {
  /** Current text scale as a percentage (100–200). */
  scale: number;
  /** Set a new scale; clamps, applies to the document root, and persists it. */
  setScale: (scale: number) => void;
}

const TextSizeContext = createContext<TextSizeContextValue | undefined>(undefined);

/**
 * App-wide text-size setting (Requirement 18.1, 18.2).
 *
 * Holds the chosen scale, applies it to the document root (so all rem/em-based
 * UI reflows), and persists it. Because the provider wraps the whole app in the
 * root layout and the scale is applied to `<html>` + saved to storage, the size
 * carries over to every subsequently rendered screen and across reloads.
 */
export function TextSizeProvider({ children }: { children: ReactNode }) {
  const [scale, setScaleState] = useState<number>(DEFAULT_TEXT_SCALE);

  // On mount, restore the stored scale and apply it to the document root.
  useEffect(() => {
    const stored = readStoredTextScale();
    setScaleState(stored);
    applyTextScale(stored);
  }, []);

  const setScale = useCallback((next: number) => {
    const clamped = clampTextScale(next);
    setScaleState(clamped);
    applyTextScale(clamped);
    storeTextScale(clamped);
  }, []);

  const value = useMemo<TextSizeContextValue>(
    () => ({ scale, setScale }),
    [scale, setScale],
  );

  return <TextSizeContext.Provider value={value}>{children}</TextSizeContext.Provider>;
}

export function useTextSize(): TextSizeContextValue {
  const ctx = useContext(TextSizeContext);
  if (!ctx) {
    throw new Error("useTextSize must be used within a TextSizeProvider");
  }
  return ctx;
}
