package com.caygiapha.familytree.service;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

/**
 * Unit tests for {@link NameNormalizer} — the case-folding, diacritic-insensitive normalization
 * behind name search (Requirement 16.1).
 */
class NameNormalizerTest {

    @Test
    void stripsVietnameseDiacriticsToBaseLetters() {
        assertThat(NameNormalizer.normalize("Nguyễn")).isEqualTo("nguyen");
        assertThat(NameNormalizer.normalize("Trần Thị Hoà")).isEqualTo("tran thi hoa");
        assertThat(NameNormalizer.normalize("Lê Văn Ước")).isEqualTo("le van uoc");
    }

    @Test
    void mapsDStrokeToPlainD() {
        assertThat(NameNormalizer.normalize("Đặng")).isEqualTo("dang");
        assertThat(NameNormalizer.normalize("đỗ")).isEqualTo("do");
    }

    @Test
    void caseFoldsRegardlessOfInputCasing() {
        assertThat(NameNormalizer.normalize("NGUYỄN")).isEqualTo("nguyen");
        assertThat(NameNormalizer.normalize("nguyễn")).isEqualTo("nguyen");
    }

    @Test
    void treatsNullAsEmpty() {
        assertThat(NameNormalizer.normalize(null)).isEmpty();
    }

    @Test
    void substringMatchIsCaseAndDiacriticInsensitive() {
        // Query without diacritics or casing matches a diacritic, mixed-case name.
        assertThat(NameNormalizer.containsNormalized("Nguyễn Văn Đức", "van duc")).isTrue();
        assertThat(NameNormalizer.containsNormalized("Nguyễn Văn Đức", "NGUYEN")).isTrue();
        // A query with diacritics matches the same normalized name.
        assertThat(NameNormalizer.containsNormalized("Nguyen Van Duc", "Đức")).isTrue();
        // Non-substring does not match.
        assertThat(NameNormalizer.containsNormalized("Nguyễn Văn Đức", "Trần")).isFalse();
    }
}
