/**
 * Text-size scaling foundation (Requirement 18.1, 18.2).
 *
 * The application root (`<html>`) uses `font-size: <scale>%` and the rest of the
 * UI is sized in rem/em units, so changing the root percentage scales ALL text
 * proportionally without clipping content. The chosen scale is persisted so it
 * applies to every subsequently rendered screen (18.2), including after a full
 * reload.
 *
 * Pure helpers live here (framework-free) so they are trivially testable; the
 * React provider/control consume them.
 */

/** localStorage key under which the chosen scale (a percentage) is stored. */
export const TEXT_SIZE_STORAGE_KEY = "cgp.textScale";

/** Minimum supported scale: 100% of the default size. */
export const MIN_TEXT_SCALE = 100;

/** Maximum supported scale: at least 200% of the default size (18.1). */
export const MAX_TEXT_SCALE = 200;

/** Default scale applied when nothing is stored. */
export const DEFAULT_TEXT_SCALE = 100;

/** Step between adjacent discrete options / increment buttons. */
export const TEXT_SCALE_STEP = 25;

/** Discrete options offered by the control (100%–200% inclusive). */
export const TEXT_SCALE_OPTIONS: readonly number[] = [100, 125, 150, 175, 200];

/**
 * Clamp an arbitrary numeric input to the supported `[MIN, MAX]` range, rounding
 * to the nearest whole percent. Non-finite values fall back to the default.
 */
export function clampTextScale(value: number): number {
  if (!Number.isFinite(value)) {
    return DEFAULT_TEXT_SCALE;
  }
  const rounded = Math.round(value);
  if (rounded < MIN_TEXT_SCALE) {
    return MIN_TEXT_SCALE;
  }
  if (rounded > MAX_TEXT_SCALE) {
    return MAX_TEXT_SCALE;
  }
  return rounded;
}

/**
 * Apply a scale to the document root by setting its font-size percentage. All
 * rem/em-based sizing reflows accordingly. Also records the value in a
 * `data-text-scale` attribute for styling/testing hooks.
 */
export function applyTextScale(
  scale: number,
  root: HTMLElement = document.documentElement,
): number {
  const clamped = clampTextScale(scale);
  root.style.fontSize = `${clamped}%`;
  root.dataset.textScale = String(clamped);
  return clamped;
}

/** Read and clamp the stored scale, falling back to the default if absent/invalid. */
export function readStoredTextScale(storage?: Storage): number {
  const store = storage ?? safeLocalStorage();
  if (!store) {
    return DEFAULT_TEXT_SCALE;
  }
  const raw = store.getItem(TEXT_SIZE_STORAGE_KEY);
  if (raw == null || raw.trim() === "") {
    return DEFAULT_TEXT_SCALE;
  }
  return clampTextScale(Number(raw));
}

/** Persist the (clamped) scale so it applies to subsequently rendered screens. */
export function storeTextScale(scale: number, storage?: Storage): void {
  const store = storage ?? safeLocalStorage();
  if (!store) {
    return;
  }
  store.setItem(TEXT_SIZE_STORAGE_KEY, String(clampTextScale(scale)));
}

/** Access localStorage defensively (SSR / privacy modes throw or lack it). */
function safeLocalStorage(): Storage | null {
  try {
    if (typeof window === "undefined" || !window.localStorage) {
      return null;
    }
    return window.localStorage;
  } catch {
    return null;
  }
}
