package com.caygiapha.familytree.util;

public final class VietCalendar {
    private static final double PI = Math.PI;

    private VietCalendar() {
        // Utility class
    }

    /**
     * Calculate Julian Day Number from a Gregorian date.
     */
    public static int jdFromDate(int dd, int mm, int yy) {
        int a = (14 - mm) / 12;
        int y = yy + 4800 - a;
        int m = mm + 12 * a - 3;
        int jd = dd + (153 * m + 2) / 5 + 365 * y + y / 4 - y / 100 + y / 400 - 32045;
        if (jd < 2299161) {
            jd = dd + (153 * m + 2) / 5 + 365 * y + y / 4 - 32083;
        }
        return jd;
    }

    /**
     * Calculate Gregorian date from a Julian Day Number.
     */
    public static int[] jdToDate(int jd) {
        int a, b, c;
        if (jd > 2299160) {
            a = jd + 32044;
            b = (4 * a + 3) / 146097;
            c = a - b * 146097 / 4;
        } else {
            b = 0;
            c = jd + 32082;
        }
        int d = (4 * c + 3) / 1461;
        int e = c - 1461 * d / 4;
        int m = (5 * e + 2) / 153;
        int day = e - (153 * m + 2) / 5 + 1;
        int month = m + 3 - 12 * (m / 10);
        int year = b * 100 + d - 4800 + m / 10;
        return new int[]{day, month, year};
    }

    private static double sunLongitude(double jdn) {
        return sunLongitudeAA98(jdn);
    }

    private static double sunLongitudeAA98(double jdn) {
        double julianTime = (jdn - 2451545.0) / 36525;
        double squareJulianTime = julianTime * julianTime;
        double dr = PI / 180;
        double meanAnomaly = 357.52910 + 35999.05030 * julianTime - 0.0001559 * squareJulianTime - 0.00000048 * julianTime * squareJulianTime;
        double meanLongitude = 280.46645 + 36000.76983 * julianTime + 0.0003032 * squareJulianTime;
        double dl = (1.914600 - 0.004817 * julianTime - 0.000014 * squareJulianTime) * Math.sin(dr * meanAnomaly);
        dl += (0.019993 - 0.000101 * julianTime) * Math.sin(dr * 2 * meanAnomaly) + 0.000290 * Math.sin(dr * 3 * meanAnomaly);
        double trueLongitude = meanLongitude + dl;
        trueLongitude -= 360 * Math.floor(trueLongitude / 360);
        return trueLongitude;
    }

    private static double newMoon(int k) {
        return newMoonAA98(k);
    }

    private static double newMoonAA98(int k) {
        double julianTime = k / 1236.85;
        double squareJulianTime = julianTime * julianTime;
        double cubicJulianTime = squareJulianTime * julianTime;
        double dr = PI / 180;
        double jd1 = 2415020.75933 + 29.53058868 * k + 0.0001178 * squareJulianTime - 0.000000155 * cubicJulianTime;
        jd1 += 0.00033 * Math.sin((166.56 + 132.87 * julianTime - 0.009173 * squareJulianTime) * dr);
        double sunMeanAnomaly = 359.2242 + 29.10535608 * k - 0.0000333 * squareJulianTime - 0.00000347 * cubicJulianTime;
        double moonMeanAnomaly = 306.0253 + 385.81691806 * k + 0.0107306 * squareJulianTime + 0.00001236 * cubicJulianTime;
        double f = 21.2964 + 390.67050646 * k - 0.0016528 * squareJulianTime - 0.00000239 * cubicJulianTime;
        double c1 = (0.1734 - 0.000393 * julianTime) * Math.sin(sunMeanAnomaly * dr) + 0.0021 * Math.sin(2 * dr * sunMeanAnomaly);
        c1 = c1 - 0.4068 * Math.sin(moonMeanAnomaly * dr) + 0.0161 * Math.sin(dr * 2 * moonMeanAnomaly);
        c1 -= 0.0004 * Math.sin(dr * 3 * moonMeanAnomaly);
        c1 = c1 + 0.0104 * Math.sin(dr * 2 * f) - 0.0051 * Math.sin(dr * (sunMeanAnomaly + moonMeanAnomaly));
        c1 = c1 - 0.0074 * Math.sin(dr * (sunMeanAnomaly - moonMeanAnomaly)) + 0.0004 * Math.sin(dr * (2 * f + sunMeanAnomaly));
        c1 = c1 - 0.0004 * Math.sin(dr * (2 * f - sunMeanAnomaly)) - 0.0006 * Math.sin(dr * (2 * f + moonMeanAnomaly));
        c1 += 0.0010 * Math.sin(dr * (2 * f - moonMeanAnomaly)) + 0.0005 * Math.sin(dr * (2 * moonMeanAnomaly + sunMeanAnomaly));
        double deltAt;
        if (julianTime < -11) {
            deltAt = 0.001 + 0.000839 * julianTime + 0.0002261 * squareJulianTime - 0.00000845 * cubicJulianTime - 0.000000081 * julianTime * cubicJulianTime;
        } else {
            deltAt = -0.000278 + 0.000265 * julianTime + 0.000262 * squareJulianTime;
        }
        return jd1 + c1 - deltAt;
    }

    private static double getSunLongitude(int dayNumber, double timeZone) {
        return sunLongitude(dayNumber - 0.5 - timeZone / 24);
    }

    private static int getNewMoonDay(int k, double timeZone) {
        double jd = newMoon(k);
        return (int) Math.floor(jd + 0.5 + timeZone / 24);
    }

    private static int getLunarMonth11(int yy, double timeZone) {
        double off = jdFromDate(31, 12, yy) - 2415021.076998695;
        int k = (int) Math.floor(off / 29.530588853);
        int nm = getNewMoonDay(k, timeZone);
        int sunLong = (int) Math.floor(getSunLongitude(nm, timeZone) / 30);
        if (sunLong >= 9) {
            nm = getNewMoonDay(k - 1, timeZone);
        }
        return nm;
    }

    private static int getLeapMonthOffset(int a11, double timeZone) {
        int k = (int) Math.floor(0.5 + (a11 - 2415021.076998695) / 29.530588853);
        int last;
        int i = 1;
        int arc = (int) Math.floor(getSunLongitude(getNewMoonDay(k + i, timeZone), timeZone) / 30);
        do {
            last = arc;
            i++;
            arc = (int) Math.floor(getSunLongitude(getNewMoonDay(k + i, timeZone), timeZone) / 30);
        } while (arc != last && i < 14);
        return i - 1;
    }

    /**
     * Convert Gregorian (Solar) date to Vietnamese Lunar date.
     * Returns int[4] where:
     * - [0] = Lunar day
     * - [1] = Lunar month
     * - [2] = Lunar year
     * - [3] = Leap indicator (1 if leap month, 0 if regular)
     */
    public static int[] convertSolar2Lunar(int dd, int mm, int yy, double timeZone) {
        int lunarDay;
        int lunarMonth;
        int lunarYear;
        int lunarLeap;
        int dayNumber = jdFromDate(dd, mm, yy);
        int k = (int) Math.floor((dayNumber - 2415021.076998695) / 29.530588853);
        int monthStart = getNewMoonDay(k + 1, timeZone);
        if (monthStart > dayNumber) {
            monthStart = getNewMoonDay(k, timeZone);
        }
        int a11 = getLunarMonth11(yy, timeZone);
        int b11 = a11;
        if (a11 >= monthStart) {
            lunarYear = yy;
            a11 = getLunarMonth11(yy - 1, timeZone);
        } else {
            lunarYear = yy + 1;
            b11 = getLunarMonth11(yy + 1, timeZone);
        }
        lunarDay = dayNumber - monthStart + 1;
        int diff = (int) Math.floor((monthStart - a11) / 29.0);
        lunarLeap = 0;
        lunarMonth = diff + 11;
        if (b11 - a11 > 365) {
            int leapMonthDiff = getLeapMonthOffset(a11, timeZone);
            if (diff >= leapMonthDiff) {
                lunarMonth = diff + 10;
                if (diff == leapMonthDiff) {
                    lunarLeap = 1;
                }
            }
        }
        if (lunarMonth > 12) {
            lunarMonth -= 12;
        }
        if (lunarMonth >= 11 && diff < 4) {
            lunarYear -= 1;
        }
        return new int[]{lunarDay, lunarMonth, lunarYear, lunarLeap};
    }

    /**
     * Convert Vietnamese Lunar date to Gregorian (Solar) date.
     * Returns int[3] where [0]=day, [1]=month, [2]=year.
     * Returns [0, 0, 0] if the combination is invalid for that year.
     */
    public static int[] convertLunar2Solar(int lunarDay, int lunarMonth, int lunarYear, int lunarLeap, double timeZone) {
        int a11;
        int b11;
        if (lunarMonth < 11) {
            a11 = getLunarMonth11(lunarYear - 1, timeZone);
            b11 = getLunarMonth11(lunarYear, timeZone);
        } else {
            a11 = getLunarMonth11(lunarYear, timeZone);
            b11 = getLunarMonth11(lunarYear + 1, timeZone);
        }
        int k = (int) Math.floor(0.5 + (a11 - 2415021.076998695) / 29.530588853);
        int off = lunarMonth - 11;
        if (off < 0) {
            off += 12;
        }
        if (b11 - a11 > 365) {
            int leapOff = getLeapMonthOffset(a11, timeZone);
            int leapMonth = leapOff - 2;
            if (leapMonth < 0) {
                leapMonth += 12;
            }
            if (lunarLeap != 0 && lunarMonth != leapMonth) {
                return new int[]{0, 0, 0};
            } else if (lunarLeap != 0 || off >= leapOff) {
                off += 1;
            }
        } else {
            if (lunarLeap != 0) {
                return new int[]{0, 0, 0};
            }
        }
        int monthStart = getNewMoonDay(k + off, timeZone);
        return jdToDate(monthStart + lunarDay - 1);
    }
}
