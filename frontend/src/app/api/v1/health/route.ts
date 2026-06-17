import { handleApiRoute } from "@/lib/services/routeHelper";

export async function GET() {
  return handleApiRoute(async () => {
    return Response.json({ status: "UP" });
  });
}
