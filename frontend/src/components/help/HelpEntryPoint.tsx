import Link from "next/link";

/**
 * Help_System entry point for the main application interface (Requirement 17.1).
 *
 * A self-contained link to the `/help` route. It is intentionally additive so
 * the main navigation can include it with a single line (e.g. in the header
 * nav of `app/layout.tsx`) without coupling the layout to help internals:
 *
 *   import { HelpEntryPoint } from "@/components/help/HelpEntryPoint";
 *   ...
 *   <HelpEntryPoint />
 */
interface HelpEntryPointProps {
  /** Optional visible label override; defaults to the Vietnamese label. */
  label?: string;
}

export function HelpEntryPoint({ label = "Hướng dẫn sử dụng" }: HelpEntryPointProps) {
  return (
    <Link href="/help" data-testid="help-entry-point" className="hamburger-menu__link">
      <span style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="16" x2="12" y2="12"></line>
          <line x1="12" y1="8" x2="12.01" y2="8"></line>
        </svg>
        <span>{label}</span>
      </span>
    </Link>
  );
}
