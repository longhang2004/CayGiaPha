package com.caygiapha.familytree.dto;

import java.time.LocalDate;
import java.util.UUID;

public record UpcomingEventResponse(
        UUID personId,
        String displayName,
        String relationship,
        String eventType,
        LocalDate eventDate,
        String originalDate,
        int daysRemaining) {
}
