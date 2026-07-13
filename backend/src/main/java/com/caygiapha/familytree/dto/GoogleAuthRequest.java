package com.caygiapha.familytree.dto;

import jakarta.validation.constraints.NotBlank;

public record GoogleAuthRequest(
        @NotBlank(message = "ID Token is required.") String idToken,
        String region,
        boolean acceptedTos,
        boolean acceptedPrivacy,
        String displayName
) {}
