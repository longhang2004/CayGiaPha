package com.caygiapha.familytree.util;

import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class VietCalendarTest {

    private static final double TZ_VN = 7.0;

    @Test
    void testJulianDayConversion() {
        int jd = VietCalendar.jdFromDate(1, 1, 2000);
        int[] date = VietCalendar.jdToDate(jd);
        assertEquals(1, date[0]);
        assertEquals(1, date[1]);
        assertEquals(2000, date[2]);
    }

    @Test
    void testSolarToLunarTet1985() {
        // Vietnamese Tet in 1985 was on January 21, 1985 (Gregorian)
        // China Tet was on February 20, 1985
        int[] lunar = VietCalendar.convertSolar2Lunar(21, 1, 1985, TZ_VN);
        assertEquals(1, lunar[0], "Tet day should be 1");
        assertEquals(1, lunar[1], "Tet month should be 1");
        assertEquals(1985, lunar[2], "Tet year should be 1985");
        assertEquals(0, lunar[3], "Leap should be 0");
    }

    @Test
    void testLunarToSolarTet1985() {
        int[] solar = VietCalendar.convertLunar2Solar(1, 1, 1985, 0, TZ_VN);
        assertEquals(21, solar[0]);
        assertEquals(1, solar[1]);
        assertEquals(1985, solar[2]);
    }

    @Test
    void testSolarToLunarHungKingsFestival2024() {
        // Giỗ Tổ Hùng Vương 10/03 Lunar was on April 18, 2024 (Gregorian)
        int[] lunar = VietCalendar.convertSolar2Lunar(18, 4, 2024, TZ_VN);
        assertEquals(10, lunar[0]);
        assertEquals(3, lunar[1]);
        assertEquals(2024, lunar[2]);
        assertEquals(0, lunar[3]);
    }

    @Test
    void testLunarToSolarHungKingsFestival2024() {
        int[] solar = VietCalendar.convertLunar2Solar(10, 3, 2024, 0, TZ_VN);
        assertEquals(18, solar[0]);
        assertEquals(4, solar[1]);
        assertEquals(2024, solar[2]);
    }

    @Test
    void testLunarToSolarInvalidLeapMonth() {
        // Lunar year 2024 has no leap month (2023 had leap Feb, 2025 has leap June)
        // So requesting a leap month in 2024 should return [0, 0, 0]
        int[] solar = VietCalendar.convertLunar2Solar(10, 3, 2024, 1, TZ_VN);
        assertEquals(0, solar[0]);
        assertEquals(0, solar[1]);
        assertEquals(0, solar[2]);
    }
}
