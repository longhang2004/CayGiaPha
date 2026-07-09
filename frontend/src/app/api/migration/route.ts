import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Previously an unauthenticated DDL runner. Permanently disabled.
 * Schema changes must go through Flyway (backend) or controlled deploy scripts.
 */
export async function GET() {
  return NextResponse.json(
    { error: { code: "NOT_FOUND", message: "Not found." } },
    { status: 404 },
  );
}

export async function POST() {
  return GET();
}
