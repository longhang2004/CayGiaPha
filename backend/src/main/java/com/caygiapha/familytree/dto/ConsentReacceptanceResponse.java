package com.caygiapha.familytree.dto;

/** Response body for {@code POST /api/v1/me/consent} after recording current document versions. */
public record ConsentReacceptanceResponse(boolean consentRequired) {
}
