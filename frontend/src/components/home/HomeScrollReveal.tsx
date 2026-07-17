"use client";

import { type ReactNode, useEffect, useRef } from "react";

interface HomeScrollRevealProps {
  enabled: boolean;
  children: ReactNode;
}

export function HomeScrollReveal({ enabled, children }: HomeScrollRevealProps) {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const revealItems = Array.from(root.querySelectorAll<HTMLElement>(".home-reveal"));
    const revealAll = () => {
      revealItems.forEach((item) => item.classList.add("is-visible"));
    };

    if (!enabled || !("IntersectionObserver" in window)) {
      root.classList.remove("home-landing--reveal-ready");
      revealAll();
      return;
    }

    root.classList.add("home-landing--reveal-ready");
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;

          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        });
      },
      {
        threshold: 0.12,
        rootMargin: "0px 0px -12%",
      },
    );

    revealItems.forEach((item) => observer.observe(item));

    return () => observer.disconnect();
  }, [enabled]);

  return (
    <div
      ref={rootRef}
      className={`home-landing${enabled ? " home-landing--animated" : ""}`}
    >
      {children}
    </div>
  );
}
