package com.caygiapha.familytree.dto;

import java.util.UUID;

public record MeProfileResponse(
        UUID userId,
        String displayName
) {}
