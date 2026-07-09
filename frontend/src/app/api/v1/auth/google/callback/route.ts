export const dynamic = "force-dynamic";

import { handleApiRoute } from "@/lib/services/routeHelper";
import { sessionService } from "@/lib/services/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { auditService, AuditActions } from "@/lib/services/audit";

export async function GET(request: Request) {
  return handleApiRoute(async () => {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    if (!code) {
      return NextResponse.redirect(`${appUrl}/signin?error=Google OAuth code missing.`);
    }

    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      console.error("Missing Google OAuth credentials in environment.");
      return NextResponse.redirect(`${appUrl}/signin?error=Google OAuth credentials not configured.`);
    }

    const redirectUri = `${appUrl}/api/v1/auth/google/callback`;

    // 1. Exchange authorization code for tokens
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json();
      console.error("Failed to exchange Google OAuth code:", errorData);
      return NextResponse.redirect(`${appUrl}/signin?error=Failed to exchange code.`);
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    // 2. Fetch user profile from Google UserInfo API
    const userinfoResponse = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!userinfoResponse.ok) {
      console.error("Failed to fetch Google userinfo");
      return NextResponse.redirect(`${appUrl}/signin?error=Failed to retrieve user profile.`);
    }

    const profile = await userinfoResponse.json();
    const email = profile.email;

    if (!email) {
      console.error("Google user profile does not contain a verified email.");
      return NextResponse.redirect(`${appUrl}/signin?error=Email address missing from Google profile.`);
    }

    // 3. Find or create the user in the database
    let user = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .then((rows) => rows[0]);

    let isNewUser = false;
    if (!user) {
      isNewUser = true;
      const [inserted] = await db
        .insert(users)
        .values({
          email,
          phone: null,
          verified: true, // OAuth emails are pre-verified by Google
        })
        .returning();
      user = inserted;

      await auditService.record(
        user.id,
        AuditActions.SIGN_UP_VERIFIED,
        "user",
        user.id
      );
    }

    // 4. Create session and set the session cookie
    const session = await sessionService.create(user.id);
    cookies().set("SESSION", session.rawToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 30 * 24 * 60 * 60, // 30 days in seconds
    });

    await auditService.record(
      user.id,
      AuditActions.SIGN_IN,
      "user",
      user.id
    );

    // Redirect user to the app dashboard
    return NextResponse.redirect(`${appUrl}/tree`);
  });
}
