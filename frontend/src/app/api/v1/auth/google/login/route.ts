export const dynamic = "force-dynamic";

import { handleApiRoute } from "@/lib/services/routeHelper";
import { NextResponse } from "next/server";

export async function GET() {
  return handleApiRoute(async () => {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    if (!clientId) {
      return NextResponse.json(
        { error: "GOOGLE_CLIENT_ID is not configured in environment variables." },
        { status: 500 }
      );
    }

    const redirectUri = `${appUrl}/api/v1/auth/google/callback`;
    const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(
      clientId
    )}&redirect_uri=${encodeURIComponent(
      redirectUri
    )}&response_type=code&scope=openid%20email%20profile&prompt=select_account`;

    return NextResponse.redirect(googleAuthUrl);
  });
}
