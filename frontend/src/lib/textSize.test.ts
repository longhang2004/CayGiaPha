import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  DEFAULT_TEXT_SCALE,
  MAX_TEXT_SCALE,
  MIN_TEXT_SCALE,
  TEXT_SIZE_STORAGE_KEY,
  applyTextScale,
  clampTextScale,
  readStoredTextScale,
  storeTextScale,
} from "./textSize";

describe("clampTextScale", () => {
  it("keeps values within the supported range", () => {
    expect(clampTextScale(100)).toBe(100);
    expect(clampTextScale(150)).toBe(150);
    expect(clampTextScale(200)).toBe(200);
  });

  it("clamps below the minimum and above the maximum", () => {
    expect(clampTextScale(50)).toBe(MIN_TEXT_SCALE);
    expect(clampTextScale(0)).toBe(MIN_TEXT_SCALE);
    expect(clampTextScale(250)).toBe(MAX_TEXT_SCALE);
  });

  it("rounds fractional percentages", () => {
    expect(clampTextScale(149.6)).toBe(150);
  });

  it("falls back to the default for non-finite input", () => {
    expect(clampTextScale(Number.NaN)).toBe(DEFAULT_TEXT_SCALE);
    expect(clampTextScale(Number.POSITIVE_INFINITY)).toBe(DEFAULT_TEXT_SCALE);
  });
});

describe("applyTextScale", () => {
  it("sets the root font-size percentage and data attribute", () => {
    const root = document.createElement("html");
    applyTextScale(175, root);
    expect(root.style.fontSize).toBe("175%");
    expect(root.dataset.textScale).toBe("175");
  });

  it("clamps before applying", () => {
    const root = document.createElement("html");
    applyTextScale(500, root);
    expect(root.style.fontSize).toBe(`${MAX_TEXT_SCALE}%`);
  });
});

describe("readStoredTextScale / storeTextScale", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    window.localStorage.clear();
  });

  it("returns the default when nothing is stored", () => {
    expect(readStoredTextScale()).toBe(DEFAULT_TEXT_SCALE);
  });

  it("round-trips a stored value", () => {
    storeTextScale(150);
    expect(window.localStorage.getItem(TEXT_SIZE_STORAGE_KEY)).toBe("150");
    expect(readStoredTextScale()).toBe(150);
  });

  it("clamps an out-of-range stored value on read", () => {
    window.localStorage.setItem(TEXT_SIZE_STORAGE_KEY, "999");
    expect(readStoredTextScale()).toBe(MAX_TEXT_SCALE);
  });

  it("falls back to the default for a non-numeric stored value", () => {
    window.localStorage.setItem(TEXT_SIZE_STORAGE_KEY, "abc");
    expect(readStoredTextScale()).toBe(DEFAULT_TEXT_SCALE);
  });
});
