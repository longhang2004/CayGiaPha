import { notFound } from "next/navigation";
import type { ReactNode } from "react";

/**
 * Layout for the (prototype) route group.
 *
 * Guards: returns 404 in production so prototype routes are completely
 * unreachable outside of dev/local environments.
 *
 * NOTE: The real root layout (src/app/layout.tsx) already wraps children with
 * SessionProvider, TextSizeProvider, and AppLayoutWrapper. This layout only
 * needs to add the prototype banner — all other chrome is inherited.
 */
export default function PrototypeLayout({ children }: { children: ReactNode }) {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  return (
    <>
      {children}
    </>
  );
}
