import { ApiException } from "./errors";

export async function handleApiRoute(handler: () => Promise<Response>): Promise<Response> {
  try {
    return await handler();
  } catch (error) {
    if (error instanceof ApiException) {
      return error.toResponse();
    }
    console.error("Internal Server Error in API Route:", error);
    return Response.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: "Đã xảy ra lỗi hệ thống. Vui lòng thử lại sau.",
        },
      },
      { status: 500 }
    );
  }
}
