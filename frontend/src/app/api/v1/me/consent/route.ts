import { getAuthContext } from "@/lib/services/authorization";
import { consentService } from "@/lib/services/consent";
import { ApiException } from "@/lib/services/errors";
import { handleApiRoute } from "@/lib/services/routeHelper";

export async function POST(request: Request) {
  return handleApiRoute(async () => {
    const auth = await getAuthContext();
    if (!auth.isAuthenticated || !auth.userId) {
      throw ApiException.notAuthorized("Bạn cần đăng nhập để ghi nhận chấp thuận.");
    }

    const body = await request.json().catch(() => ({}));
    consentService.requireConsent(body.acceptedTos === true, body.acceptedPrivacy === true);
    await consentService.recordConsent(auth.userId);
    return Response.json({ consentRequired: false });
  });
}
