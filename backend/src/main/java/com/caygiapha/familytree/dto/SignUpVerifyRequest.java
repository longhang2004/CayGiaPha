package com.caygiapha.familytree.dto;

/**
 * Request body for {@code POST /api/v1/auth/signup/verify} (Requirements 1.4, 1.8, 13.1).
 *
 * <p>The recipient resubmits the {@code identifier} they signed up with together with the 6-digit
 * {@code code} they received; the {@code Auth_Service} resolves the account from the identifier and
 * verifies the code.
 *
 * <p>The optional {@code region} lets the owner choose their regional dialect (Bắc/Trung/Nam) at
 * sign-up, which governs the kinship terms their tree will use (Requirement 9.2/9.6). When omitted
 * or blank, the tree is created with the default region (Bắc).
 *
 * @param identifier the phone number or email the account was created with
 * @param code       the 6-digit verification code received
 * @param region     the chosen region key ({@code Bac}/{@code Trung}/{@code Nam}); optional
 * @param acceptedTos     whether the owner accepts the current Terms of Service (Requirement 23.2)
 * @param acceptedPrivacy whether the owner accepts the current Privacy Policy (Requirement 23.2)
 */
public record SignUpVerifyRequest(
        String identifier,
        String code,
        String region,
        boolean acceptedTos,
        boolean acceptedPrivacy) {
}
