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

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  return handleApiRoute(async () => {
    const auth = await getAuthContext();
    const { searchParams } = new URL(request.url);
    const treeId = searchParams.get("treeId");
    if (!treeId) {
      throw ApiException.validation("treeId", "treeId query parameter is required.");
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;
    if (!file) {
      throw ApiException.validation("file", "An image file is required.");
    }

    const arrayBuffer = await file.arrayBuffer();
    const bytes = Buffer.from(arrayBuffer);

    const personId = params.id;
    const photo = await photoService.upload(
      auth.userId || "",
      auth.ownedTreeId,
      treeId,
      personId,
      bytes
    );

    return Response.json(formatPhoto(photo), { status: 201 });
  });
}

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
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

    const photos = await photoService.list(
      auth.userId || "",
      auth.ownedTreeId,
      treeId,
      personId,
      shareToken
    );

    return Response.json(photos.map(formatPhoto));
  });
}
