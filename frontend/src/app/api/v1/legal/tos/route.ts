import { handleApiRoute } from "@/lib/services/routeHelper";
import { consentService } from "@/lib/services/consent";

export const dynamic = "force-dynamic";

export async function GET() {
  return handleApiRoute(async () => {
    const doc = await consentService.currentDocument("tos");
    return Response.json({
      id: doc.id,
      docType: doc.docType,
      version: doc.version,
      body: doc.body,
      publishedAt: doc.publishedAt,
    });
  });
}
