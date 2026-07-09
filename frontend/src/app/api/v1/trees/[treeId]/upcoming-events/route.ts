import { handleApiRoute } from "@/lib/services/routeHelper";
import { getAuthContext, authorizationService } from "@/lib/services/authorization";
import { ApiException } from "@/lib/services/errors";
import { db } from "@/lib/db";
import { persons } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { convertLunar2Solar } from "@/lib/vietCalendar";

function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

function getSolarDateWithFallback(year: number, month: number, day: number): Date {
  if (month === 2 && day === 29) {
    return isLeapYear(year) ? new Date(year, 1, 29) : new Date(year, 1, 28);
  }
  return new Date(year, month - 1, day);
}

function calculateNextAnniversary(
  day: number,
  month: number,
  calendar: string,
  leap: boolean,
  today: Date
): Date | null {
  const currentYear = today.getFullYear();
  const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  if (calendar === "solar") {
    let anniversary = getSolarDateWithFallback(currentYear, month, day);
    if (anniversary < todayMidnight) {
      anniversary = getSolarDateWithFallback(currentYear + 1, month, day);
    }
    return anniversary;
  } else {
    let nextAnniversary: Date | null = null;
    for (let y = currentYear - 1; y <= currentYear + 1; y++) {
      let solar = convertLunar2Solar(day, month, y, leap ? 1 : 0);
      if (solar[0] === 0 && leap) {
        solar = convertLunar2Solar(day, month, y, 0);
      }
      if (solar[0] !== 0) {
        const solarDate = new Date(solar[2], solar[1] - 1, solar[0]);
        if (solarDate >= todayMidnight) {
          if (nextAnniversary === null || solarDate < nextAnniversary) {
            nextAnniversary = solarDate;
          }
        }
      }
    }
    return nextAnniversary;
  }
}

function getDaysDifference(d1: Date, d2: Date): number {
  const date1 = new Date(d1.getFullYear(), d1.getMonth(), d1.getDate());
  const date2 = new Date(d2.getFullYear(), d2.getMonth(), d2.getDate());
  const diffTime = date2.getTime() - date1.getTime();
  return Math.round(diffTime / (1000 * 60 * 60 * 24));
}

function formatOriginalDeathDate(day: number, month: number, calendar: string, leap: boolean): string {
  if (calendar === "solar") {
    return `${String(day).padStart(2, "0")}/${String(month).padStart(2, "0")} (Dương lịch)`;
  } else {
    return `Ngày ${day} tháng ${month} ${leap ? "(Nhuận) " : ""}Âm lịch`;
  }
}

function formatISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export async function GET(
  request: Request,
  { params }: { params: { treeId: string } }
) {
  return handleApiRoute(async () => {
    const auth = await getAuthContext();
    const treeId = params.treeId;

    if (treeId === "prototype-tree-id-0001") {
      const getRelativeISODate = (daysOffset: number) => {
        const d = new Date();
        d.setDate(d.getDate() + daysOffset);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      };
      return Response.json([
        {
          personId: "p-ong-to",
          displayName: "Ông Tổ",
          relationship: "Ông cố",
          eventType: "death_anniversary",
          eventDate: getRelativeISODate(0),
          originalDate: "Ngày 10 tháng 03 Âm lịch",
          daysRemaining: 0,
        },
        {
          personId: "p-ba-to",
          displayName: "Bà Tổ",
          relationship: "Bà cố",
          eventType: "death_anniversary",
          eventDate: getRelativeISODate(1),
          originalDate: "Ngày 15 tháng 08 Âm lịch",
          daysRemaining: 1,
        },
      ]);
    }

    const { searchParams } = new URL(request.url);
    const shareToken = request.headers.get("x-share-token") || searchParams.get("shareToken");

    await authorizationService.requireReadAccess(auth.userId, auth.ownedTreeId, treeId, shareToken);

    const deceased = await db
      .select()
      .from(persons)
      .where(and(eq(persons.treeId, treeId), eq(persons.deathStatus, true)));

    const today = new Date();
    const events = [];

    for (const person of deceased) {
      // Check privacy of death status
      const role = await authorizationService.classify(auth.userId, auth.ownedTreeId, treeId, person.id);
      const privileged = role !== "NEITHER";
      if (!privileged && person.visDeath === "private") {
        continue; // Privacy gate: skip private death info for public/link viewers
      }

      const day = person.deathDay;
      const month = person.deathMonth;
      if (day === null || month === null) {
        continue; // No date recorded
      }

      const nextAnniversary = calculateNextAnniversary(
        day,
        month,
        person.deathCalendar || "lunar",
        person.deathLunarLeap || false,
        today
      );

      if (!nextAnniversary) {
        continue;
      }

      const diff = getDaysDifference(today, nextAnniversary);
      if (diff >= 0 && diff <= 30) {
        const originalDate = formatOriginalDeathDate(
          day,
          month,
          person.deathCalendar || "lunar",
          person.deathLunarLeap || false
        );

        events.push({
          personId: person.id,
          displayName: person.displayName,
          relationship: "",
          eventType: "death_anniversary",
          eventDate: formatISO(nextAnniversary),
          originalDate,
          daysRemaining: diff,
        });
      }
    }

    // Sort chronologically by days remaining
    events.sort((a, b) => a.daysRemaining - b.daysRemaining);

    return Response.json(events);
  });
}
