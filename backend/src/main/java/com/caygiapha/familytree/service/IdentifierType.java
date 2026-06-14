package com.caygiapha.familytree.service;

/**
 * The two kinds of account/destination identifier accepted by the system: a Vietnamese phone
 * number or an email address. Produced by {@link IdentifierValidator} when it classifies a
 * submitted identifier (Requirements 1.1, 1.2, 1.7).
 */
public enum IdentifierType {

    /** A Vietnamese phone number: 10 digits beginning with {@code 0}, or {@code +84} + 9 digits. */
    PHONE,

    /** An email address of at most 254 characters in {@code local-part@domain} form. */
    EMAIL
}
