package com.caygiapha.familytree.controller;

import com.caygiapha.familytree.util.VietCalendar;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/calendar")
public class CalendarController {

    private static final double TZ_VN = 7.0;

    public record SolarToLunarResponse(int day, int month, int year, boolean leap, String formatted) {}
    public record LunarToSolarResponse(int day, int month, int year, String formatted) {}

    @GetMapping("/solar-to-lunar")
    public SolarToLunarResponse convertSolarToLunar(
            @RequestParam("day") int day,
            @RequestParam("month") int month,
            @RequestParam("year") int year) {
        int[] result = VietCalendar.convertSolar2Lunar(day, month, year, TZ_VN);
        boolean isLeap = result[3] != 0;
        String formatted = String.format("Ngày %d tháng %d %sÂm lịch", 
                result[0], result[1], isLeap ? "(Nhuận) " : "");
        return new SolarToLunarResponse(result[0], result[1], result[2], isLeap, formatted);
    }

    @GetMapping("/lunar-to-solar")
    public LunarToSolarResponse convertLunarToSolar(
            @RequestParam("day") int day,
            @RequestParam("month") int month,
            @RequestParam("year") int year,
            @RequestParam(value = "leap", defaultValue = "false") boolean leap) {
        int[] result = VietCalendar.convertLunar2Solar(day, month, year, leap ? 1 : 0, TZ_VN);
        String formatted = String.format("%02d/%02d/%d", result[0], result[1], result[2]);
        return new LunarToSolarResponse(result[0], result[1], result[2], formatted);
    }
}
