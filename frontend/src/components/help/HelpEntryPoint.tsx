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

export function HelpEntryPoint({ label = "Trợ giúp" }: HelpEntryPointProps) {
  return (
    <Link href="/help" data-testid="help-entry-point">
      {label}
    </Link>
  );
}
