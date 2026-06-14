"use client";

import { useId } from "react";
import {
  MAX_TEXT_SCALE,
  MIN_TEXT_SCALE,
  TEXT_SCALE_STEP,
} from "@/lib/textSize";
import { useTextSize } from "./TextSizeProvider";

/**
 * Text-size setting control (Requirement 18.1, 18.2).
 *
 * Lets the user scale application text from 100% up to 200% of the default. The
 * chosen size is applied to the document root and persisted by
 * `TextSizeProvider`, so it carries over to every subsequently rendered screen.
 *
 * Accessibility (Requirement 18.5, 18.6): the slider is a native
 * `<input type="range">` with an associated `<label>` and `aria-valuetext`
 * announcing the current percentage; the decrease/increase buttons have
 * programmatic names and are fully keyboard-operable. Touch-target sizing and
 * focus styles are provided app-wide in globals.css (18.4, 18.6).
 */
export function TextSizeControl() {
  const { scale, setScale } = useTextSize();
  const sliderId = useId();
  const valueText = `${scale}%`;

  return (
    <div className="text-size-control" role="group" aria-label="Cỡ chữ">
      <label htmlFor={sliderId} className="text-size-control__label">
        Cỡ chữ
      </label>
      <button
        type="button"
        className="text-size-control__step"
        onClick={() => setScale(scale - TEXT_SCALE_STEP)}
        disabled={scale <= MIN_TEXT_SCALE}
        aria-label="Giảm cỡ chữ"
      >
        A−
      </button>
      <input
        id={sliderId}
        type="range"
        min={MIN_TEXT_SCALE}
        max={MAX_TEXT_SCALE}
        step={TEXT_SCALE_STEP}
        value={scale}
        onChange={(event) => setScale(Number(event.target.value))}
        aria-valuetext={valueText}
        className="text-size-control__slider"
      />
      <button
        type="button"
        className="text-size-control__step"
        onClick={() => setScale(scale + TEXT_SCALE_STEP)}
        disabled={scale >= MAX_TEXT_SCALE}
        aria-label="Tăng cỡ chữ"
      >
        A+
      </button>
      <output htmlFor={sliderId} className="text-size-control__value" aria-live="polite">
        {valueText}
      </output>
    </div>
  );
}
