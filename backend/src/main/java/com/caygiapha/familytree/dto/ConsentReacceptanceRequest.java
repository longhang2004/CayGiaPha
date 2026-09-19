package com.caygiapha.familytree.dto;

/** Request body for {@code POST /api/v1/me/consent} (Requirement 23.4). */
public record ConsentReacceptanceRequest(boolean acceptedTos, boolean acceptedPrivacy) {
}
