import { eq } from "drizzle-orm";
import { db, ensureUserDisplayNameSchema } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { normalizeAndValidateDisplayName } from "@/lib/account/displayName";
import { authorizationService, getAuthContext } from "@/lib/services/authorization";
import { ApiException } from "@/lib/services/errors";
import { handleApiRoute } from "@/lib/services/routeHelper";

function isMissingDisplayNameColumn(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const message = String((error as { message?: string }).message ?? error);
  const code = String((error as { code?: string }).code ?? "");
  return (
    code === "42703" ||
    /column ["']?display_name["']? does not exist/i.test(message) ||
    /users\.display_name/i.test(message)
  );
}

function isDisplayNameConstraintViolation(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const message = String((error as { message?: string }).message ?? error);
  const code = String((error as { code?: string }).code ?? "");
  return (
    code === "23514" ||
    /ck_users_display_name_normalized/i.test(message) ||
    /violates check constraint/i.test(message)
  );
}

export async function PATCH(request: Request) {
  return handleApiRoute(async () => {
    const auth = await getAuthContext();
    if (!auth.isAuthenticated || !auth.userId) {
      throw ApiException.notAuthorized("Bạn cần đăng nhập để cập nhật hồ sơ.");
    }
    await authorizationService.requireAuthenticatedAccountMutation(auth.userId);

    const body = await request.json().catch(() => {
      throw ApiException.validation("displayName", "Vui lòng nhập tên hiển thị.");
    });
    const displayName = normalizeAndValidateDisplayName(body?.displayName);

    // Cold-start race: background migrator may not have added display_name yet.
    await ensureUserDisplayNameSchema();

    let updated: { userId: string; displayName: string | null } | undefined;
    try {
      [updated] = await db
        .update(users)
        .set({ displayName })
        .where(eq(users.id, auth.userId))
        .returning({ userId: users.id, displayName: users.displayName });
    } catch (error) {
      if (isMissingDisplayNameColumn(error)) {
        await ensureUserDisplayNameSchema();
        [updated] = await db
          .update(users)
          .set({ displayName })
          .where(eq(users.id, auth.userId))
          .returning({ userId: users.id, displayName: users.displayName });
      } else if (isDisplayNameConstraintViolation(error)) {
        throw ApiException.validation(
          "displayName",
          "Tên hiển thị không hợp lệ. Vui lòng nhập 1–100 ký tự, không khoảng trắng thừa.",
        );
      } else {
        throw error;
      }
    }

    if (!updated) {
      throw ApiException.notAuthorized("Bạn không có quyền cập nhật hồ sơ này.");
    }
    if (!updated.displayName) {
      throw ApiException.internal("Không thể lưu tên hiển thị. Vui lòng thử lại.");
    }
    return Response.json({ userId: updated.userId, displayName: updated.displayName });
  });
}
