package com.caygiapha.familytree.dto;

public record PasswordResetConfirmRequest(String identifier, String code, String password) {}
