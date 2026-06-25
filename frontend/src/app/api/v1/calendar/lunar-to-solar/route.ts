import { handleApiRoute } from "@/lib/services/routeHelper";
import { ApiException } from "@/lib/services/errors";
import { convertLunar2Solar } from "@/lib/vietCalendar";

export async function GET(request: Request) {
  return handleApiRoute(async () => {
    const { searchParams } = new URL(request.url);
    const dayStr = searchParams.get("day");
    const monthStr = searchParams.get("month");
    const yearStr = searchParams.get("year");
    const leapStr = searchParams.get("leap");

    if (!dayStr || !monthStr || !yearStr) {
      throw ApiException.validation("parameters", "day, month, and year are required query parameters.");
    }

    const day = parseInt(dayStr, 10);
    const month = parseInt(monthStr, 10);
    const year = parseInt(yearStr, 10);
    const leap = leapStr === "true";

    if (isNaN(day) || day < 1 || day > 30) {
      throw ApiException.validation("day", "Ngày Âm lịch phải từ 1 đến 30.");
    }
    if (isNaN(month) || month < 1 || month > 12) {
      throw ApiException.validation("month", "Tháng Âm lịch phải từ 1 đến 12.");
    }
    if (isNaN(year) || year < 1000 || year > new Date().getFullYear() + 100) {
      throw ApiException.validation("year", "Năm Âm lịch không hợp lệ.");
    }

    const [sDay, sMonth, sYear] = convertLunar2Solar(day, month, year, leap ? 1 : 0);

    if (sDay === 0) {
      throw ApiException.validation("date", "Ngày Âm lịch không hợp lệ cho năm này.");
    }

    const formatted = `${String(sDay).padStart(2, "0")}/${String(sMonth).padStart(2, "0")}/${sYear}`;

    return Response.json({
      day: sDay,
      month: sMonth,
      year: sYear,
      formatted,
    });
  });
}
