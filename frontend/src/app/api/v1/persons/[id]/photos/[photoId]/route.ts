import { handleApiRoute } from "@/lib/services/routeHelper";
import { getAuthContext } from "@/lib/services/authorization";
import { ApiException } from "@/lib/services/errors";
import { photoService } from "@/lib/services/photo";

export async function GET(
  request: Request,
  { params }: { params: { id: string; photoId: string } }
) {
  return handleApiRoute(async () => {
    const auth = await getAuthContext();
    const { searchParams } = new URL(request.url);
    const treeId = searchParams.get("treeId");
    if (!treeId) {
      throw ApiException.validation("treeId", "treeId query parameter is required.");
    }

    const shareToken = request.headers.get("x-share-token");
    const personId = params.id;
    const photoId = params.photoId;

    const image = await photoService.serve(
      auth.userId || "",
      treeId,
      personId,
      photoId,
      shareToken
    );

    return new Response(image.bytes as any, {
      headers: {
        "Content-Type": image.contentType,
        "Cache-Control": "private, no-cache",
      },
    });
  });
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string; photoId: string } }
) {
  return handleApiRoute(async () => {
    const auth = await getAuthContext();
    const { searchParams } = new URL(request.url);
    const treeId = searchParams.get("treeId");
    if (!treeId) {
      throw ApiException.validation("treeId", "treeId query parameter is required.");
    }

    const personId = params.id;
    const photoId = params.photoId;

    await photoService.delete(
      auth.userId || "",
      treeId,
      personId,
      photoId
    );

    return new Response(null, { status: 204 });
  });
}
