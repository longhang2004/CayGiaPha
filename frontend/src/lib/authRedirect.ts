export function safeInternalRedirect(value: string | undefined, fallback = "/tree"): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return fallback;
  return value;
}

export function buildAuthHref(
  pathname: "/signin" | "/signup",
  redirectTo: string,
  reason?: string,
): string {
  const params = new URLSearchParams({ redirect: safeInternalRedirect(redirectTo) });
  if (reason) params.set("reason", reason);
  return `${pathname}?${params.toString()}`;
}
