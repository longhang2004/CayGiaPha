export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";

const LEGACY_GOOGLE_FLOW_MESSAGE =
  "Vui lòng sử dụng nút Đăng nhập với Google trên trang đăng nhập.";

/**
 * The application uses POST /api/v1/auth/google for both sign-in and consented
 * account creation. The former authorization-code callback created accounts
 * without the current consent contract, so it is intentionally retired.
 */
export async function GET() {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const destination = new URL("/signin", appUrl);
  destination.searchParams.set("error", LEGACY_GOOGLE_FLOW_MESSAGE);
  return NextResponse.redirect(destination);
}
