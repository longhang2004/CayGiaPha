import { handleApiRoute } from "@/lib/services/routeHelper";
import { ApiException } from "@/lib/services/errors";
import { convertSolar2Lunar } from "@/lib/vietCalendar";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return handleApiRoute(async () => {
    const { searchParams } = new URL(request.url);
    const dayStr = searchParams.get("day");
    const monthStr = searchParams.get("month");
    const yearStr = searchParams.get("year");

    if (!dayStr || !monthStr || !yearStr) {
      throw ApiException.validation("parameters", "day, month, and year are required query parameters.");
    }

    const day = parseInt(dayStr, 10);
    const month = parseInt(monthStr, 10);
    const year = parseInt(yearStr, 10);

    if (isNaN(day) || day < 1 || day > 31) {
      throw ApiException.validation("day", "Ngày phải từ 1 đến 31.");
    }
    if (isNaN(month) || month < 1 || month > 12) {
      throw ApiException.validation("month", "Tháng phải từ 1 đến 12.");
    }
    if (isNaN(year) || year < 1000 || year > new Date().getFullYear()) {
      throw ApiException.validation("year", `Năm phải từ 1000 đến ${new Date().getFullYear()}.`);
    }

    const [lDay, lMonth, lYear, lLeap] = convertSolar2Lunar(day, month, year);

    const formatted = `Ngày ${String(lDay).padStart(2, "0")} tháng ${String(lMonth).padStart(2, "0")} ${
      lLeap === 1 ? "(Nhuận) " : ""
    }Âm lịch`;

    return Response.json({
      day: lDay,
      month: lMonth,
      year: lYear,
      leap: lLeap === 1,
      formatted,
    });
  });
}
