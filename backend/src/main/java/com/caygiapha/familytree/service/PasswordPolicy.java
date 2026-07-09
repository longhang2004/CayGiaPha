package com.caygiapha.familytree.service;

import com.caygiapha.familytree.error.ApiException;

/**
 * Shared password strength rules for sign-up and password reset.
 *
 * <p>Minimum 8 characters, maximum 128 (bcrypt DoS bound), and must contain at least one letter and
 * one digit. Rejects with field-level {@code VALIDATION_ERROR}.
 */
public final class PasswordPolicy {

    public static final int MIN_LENGTH = 8;
    public static final int MAX_LENGTH = 128;

    private PasswordPolicy() {}

    public static void requireValid(String password) {
        if (password == null || password.isBlank()) {
            throw ApiException.validation("password", "Vui lòng nhập mật khẩu.");
        }
        if (password.length() < MIN_LENGTH) {
            throw ApiException.validation("password", "Mật khẩu cần có ít nhất 8 ký tự.");
        }
        if (password.length() > MAX_LENGTH) {
            throw ApiException.validation("password", "Mật khẩu tối đa 128 ký tự.");
        }
        boolean hasLetter = false;
        boolean hasDigit = false;
        for (int i = 0; i < password.length(); i++) {
            char c = password.charAt(i);
            if (Character.isLetter(c)) {
                hasLetter = true;
            } else if (Character.isDigit(c)) {
                hasDigit = true;
            }
            if (hasLetter && hasDigit) {
                return;
            }
        }
        throw ApiException.validation(
                "password", "Mật khẩu cần có ít nhất một chữ cái và một chữ số.");
    }
}
