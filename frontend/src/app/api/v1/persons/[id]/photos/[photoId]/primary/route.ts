import { handleApiRoute } from "@/lib/services/routeHelper";
import { getAuthContext } from "@/lib/services/authorization";
import { ApiException } from "@/lib/services/errors";
import { photoService } from "@/lib/services/photo";

function formatPhoto(photo: any) {
  return {
    id: photo.id,
    personId: photo.personId,
    contentType: photo.contentType,
    byteSize: photo.byteSize,
    width: photo.width,
    height: photo.height,
    primary: photo.isPrimary,
  };
}

export async function PATCH(
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

    const photo = await photoService.setPrimary(
      auth.userId || "",
      auth.ownedTreeId,
      treeId,
      personId,
      photoId
    );

    return Response.json(formatPhoto(photo));
  });
}
