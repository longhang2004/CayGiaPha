import { handleApiRoute } from "@/lib/services/routeHelper";
import { getAuthContext } from "@/lib/services/authorization";
import { ApiException } from "@/lib/services/errors";
import { db } from "@/lib/db";
import { inAppReminders } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";

export async function GET() {
  return handleApiRoute(async () => {
    const auth = await getAuthContext();
    if (!auth.isAuthenticated || !auth.userId) {
      throw ApiException.notAuthorized("User is not authenticated.");
    }

    if (auth.userId === "prototype-user-id-0001") {
      const getRelativeISODate = (daysOffset: number) => {
        const d = new Date();
        d.setDate(d.getDate() + daysOffset);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      };
      return Response.json([
        {
          id: "mock-reminder-1",
          userId: auth.userId,
          personId: "p-ong-to",
          title: "Hôm nay Giỗ: Ông Tổ",
          content: `Hôm nay ngày ${String(new Date().getDate()).padStart(2, "0")}/${String(
            new Date().getMonth() + 1
          ).padStart(2, "0")} là ngày giỗ (ngày 10 tháng 03 Âm lịch) của Ông Tổ.`,
          daysUntil: 0,
          anniversaryDate: getRelativeISODate(0),
          isRead: false,
          createdAt: new Date().toISOString(),
        },
        {
          id: "mock-reminder-2",
          userId: auth.userId,
          personId: "p-ba-to",
          title: "Sắp đến Giỗ: Bà Tổ (sau 1 ngày)",
          content: "Ngày giỗ (ngày 15 tháng 08 Âm lịch) của Bà Tổ sẽ diễn ra vào ngày mai (sau 1 ngày nữa).",
          daysUntil: 1,
          anniversaryDate: getRelativeISODate(1),
          isRead: false,
          createdAt: new Date(Date.now() - 3600000).toISOString(),
        },
      ]);
    }

    const results = await db
      .select()
      .from(inAppReminders)
      .where(eq(inAppReminders.userId, auth.userId))
      .orderBy(desc(inAppReminders.createdAt));

    return Response.json(
      results.map((r) => ({
        id: r.id,
        userId: r.userId,
        personId: r.personId,
        title: r.title,
        content: r.content,
        daysUntil: r.daysUntil,
        anniversaryDate: r.anniversaryDate.toISOString().split("T")[0],
        isRead: r.isRead,
        createdAt: r.createdAt.toISOString(),
      }))
    );
  });
}
