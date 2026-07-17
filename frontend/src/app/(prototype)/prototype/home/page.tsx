"use client";

/**
 * Prototype: Home page
 *
 * Mirrors: src/app/page.tsx
 *
 * Renders the landing page in both logged-out and logged-in states via a
 * toggle. No real session or API call is made.
 *
 * ⚠️  Dev/local only — gated by the (prototype) layout.
 *
 * SYNC RULE: When src/app/page.tsx UI/UX changes, update this file too.
 */

import { useState } from "react";
import { HomeLanding } from "@/components/home/HomeLanding";

export default function PrototypeHomePage() {
  const [loggedIn, setLoggedIn] = useState(false);

  return (
    <>
      {/* State toggle — not part of the real page */}
      <div
        style={{
          position: "sticky",
          top: "2rem",
          zIndex: 100,
          display: "flex",
          justifyContent: "center",
          marginBottom: "1rem",
          gap: "0.5rem",
        }}
      >
        <button
          type="button"
          onClick={() => setLoggedIn(false)}
          className={`btn${!loggedIn ? "" : " btn-secondary"}`}
          style={{ fontSize: "0.8125rem" }}
        >
          Chưa đăng nhập
        </button>
        <button
          type="button"
          onClick={() => setLoggedIn(true)}
          className={`btn${loggedIn ? "" : " btn-secondary"}`}
          style={{ fontSize: "0.8125rem" }}
        >
          Đã đăng nhập
        </button>
      </div>

      {/* ===== BEGIN: mirror of src/app/page.tsx ===== */}
      <HomeLanding state={loggedIn ? "signed-in" : "signed-out"} animated={false} />
      {/* ===== END: mirror of src/app/page.tsx ===== */}
    </>
  );
}
