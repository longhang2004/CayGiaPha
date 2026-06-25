import { handleApiRoute } from "@/lib/services/routeHelper";
import { db } from "@/lib/db";
import { persons, trees, claims, inAppReminders } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
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
    return `${String(day).padStart(2, "0")}/${String(month).padStart(2, "0")} Dương lịch`;
  } else {
    return `ngày ${day} tháng ${month} ${leap ? "(Nhuận) " : ""}Âm lịch`;
  }
}

export async function POST() {
  return handleApiRoute(async () => {
    const today = new Date();
    // Fetch all deceased persons and their corresponding trees
    const deceased = await db
      .select({
        person: persons,
        tree: trees,
      })
      .from(persons)
      .innerJoin(trees, eq(persons.treeId, trees.id))
      .where(eq(persons.deathStatus, true));

    let countCreated = 0;

    for (const { person, tree } of deceased) {
      const day = person.deathDay;
      const month = person.deathMonth;
      if (day === null || month === null) {
        continue;
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
      if (diff === 7 || diff === 3 || diff === 1 || diff === 0) {
        // Collect recipient user IDs: tree owner + any user who has a claim on a person in this tree
        const recipients = new Set<string>();
        recipients.add(tree.ownerUserId);

        const dbClaims = await db
          .select({ userId: claims.userId })
          .from(claims)
          .innerJoin(persons, eq(claims.personId, persons.id))
          .where(eq(persons.treeId, tree.id));

        for (const claim of dbClaims) {
          recipients.add(claim.userId);
        }

        const originalDateStr = formatOriginalDeathDate(
          day,
          month,
          person.deathCalendar || "lunar",
          person.deathLunarLeap || false
        );

        for (const userId of recipients) {
          // Check if reminder already exists
          const existing = await db
            .select()
            .from(inAppReminders)
            .where(
              and(
                eq(inAppReminders.userId, userId),
                eq(inAppReminders.personId, person.id),
                eq(inAppReminders.anniversaryDate, nextAnniversary),
                eq(inAppReminders.daysUntil, diff)
              )
            )
            .then((rows) => rows[0]);

          if (!existing) {
            let title = "";
            let content = "";
            if (diff === 0) {
              title = `Hôm nay Giỗ: ${person.displayName}`;
              content = `Hôm nay ngày ${String(nextAnniversary.getDate()).padStart(2, "0")}/${String(
                nextAnniversary.getMonth() + 1
              ).padStart(2, "0")} là ngày giỗ (${originalDateStr}) của ${person.displayName}.`;
            } else {
              title = `Sắp đến Giỗ: ${person.displayName} (sau ${diff} ngày)`;
              content = `Ngày giỗ (${originalDateStr}) của ${person.displayName} sẽ diễn ra vào ngày ${String(
                nextAnniversary.getDate()
              ).padStart(2, "0")}/${String(nextAnniversary.getMonth() + 1).padStart(2, "0")} (sau ${diff} ngày nữa).`;
            }

            await db.insert(inAppReminders).values({
              userId,
              personId: person.id,
              title,
              content,
              daysUntil: diff,
              anniversaryDate: nextAnniversary,
              isRead: false,
            });

            countCreated++;
          }
        }
      }
    }

    return Response.json(countCreated);
  });
}
