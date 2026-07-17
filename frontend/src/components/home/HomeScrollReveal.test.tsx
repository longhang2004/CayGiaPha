import { act, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { HomeScrollReveal } from "./HomeScrollReveal";

let observerCallback: IntersectionObserverCallback;
const observe = vi.fn();
const unobserve = vi.fn();
const disconnect = vi.fn();

class MockIntersectionObserver {
  readonly root = null;
  readonly rootMargin = "0px 0px -12%";
  readonly thresholds = [0.12];

  constructor(callback: IntersectionObserverCallback) {
    observerCallback = callback;
  }

  observe = observe;
  unobserve = unobserve;
  disconnect = disconnect;
  takeRecords = () => [];
}

describe("HomeScrollReveal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(window, "IntersectionObserver", {
      configurable: true,
      writable: true,
      value: MockIntersectionObserver,
    });
  });

  afterEach(() => {
    Reflect.deleteProperty(window, "IntersectionObserver");
  });

  it("reveals each marked section once when it enters the viewport", () => {
    const { container, unmount } = render(
      <HomeScrollReveal enabled>
        <section className="home-reveal">Nội dung</section>
      </HomeScrollReveal>,
    );

    const root = container.firstElementChild as HTMLElement;
    const section = container.querySelector(".home-reveal") as HTMLElement;
    expect(root).toHaveClass("home-landing--reveal-ready");
    expect(observe).toHaveBeenCalledWith(section);

    act(() => {
      observerCallback(
        [{ isIntersecting: true, target: section } as unknown as IntersectionObserverEntry],
        {} as IntersectionObserver,
      );
    });

    expect(section).toHaveClass("is-visible");
    expect(unobserve).toHaveBeenCalledWith(section);
    unmount();
    expect(disconnect).toHaveBeenCalledTimes(1);
  });

  it("keeps content visible when IntersectionObserver is unavailable", () => {
    Reflect.deleteProperty(window, "IntersectionObserver");

    const { container } = render(
      <HomeScrollReveal enabled>
        <section className="home-reveal">Nội dung</section>
      </HomeScrollReveal>,
    );

    expect(container.querySelector(".home-reveal")).toHaveClass("is-visible");
  });

  it("does not initialize reveal motion when animation is disabled", () => {
    const { container } = render(
      <HomeScrollReveal enabled={false}>
        <section className="home-reveal">Nội dung</section>
      </HomeScrollReveal>,
    );

    expect(container.firstElementChild).not.toHaveClass("home-landing--reveal-ready");
    expect(container.querySelector(".home-reveal")).toHaveClass("is-visible");
    expect(observe).not.toHaveBeenCalled();
  });
});
