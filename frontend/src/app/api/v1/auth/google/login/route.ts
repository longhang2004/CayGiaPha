export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";

/** Redirect the retired authorization-code flow to the supported Google UI. */
export async function GET() {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const destination = new URL("/signin", appUrl);
  destination.searchParams.set(
    "error",
    "Vui lòng sử dụng nút Đăng nhập với Google trên trang đăng nhập.",
  );
  return NextResponse.redirect(destination);
}
