package com.caygiapha.familytree.service;

import java.text.Normalizer;
import java.util.Locale;

/**
 * Case-folding, diacritic-insensitive text normalization used by name search (Requirement 16.1,
 * Property 23). It maps a display name or query to a canonical key so that a substring match is
 * both case-insensitive and diacritic-insensitive.
 *
 * <p>Normalization pipeline:
 * <ol>
 *   <li><strong>Case-fold</strong> with {@link Locale#ROOT} so the result is locale-independent
 *       (e.g. {@code "Nguyễn" → "nguyễn"}).</li>
 *   <li><strong>Map đ/Đ → d</strong>. The Vietnamese letter đ does not decompose into a base
 *       letter plus a combining mark under Unicode normalization, so it is handled explicitly
 *       (after case-folding only the lowercase {@code đ} remains).</li>
 *   <li><strong>Decompose</strong> to Unicode NFD, separating base letters from their combining
 *       diacritical marks (e.g. {@code "ế" → "e" + ◌̂ + ◌́}).</li>
 *   <li><strong>Strip combining marks</strong> (Unicode {@code Mn} — non-spacing marks), leaving
 *       only base letters (e.g. {@code "ế" → "e"}).</li>
 * </ol>
 *
 * <p>This is a pure, side-effect-free utility deliberately factored out of the search service so
 * the normalized-substring property (Property 23, task 9.2) and its TypeScript counterpart (task
 * 10.5) can target the same well-defined transformation.
 */
public final class NameNormalizer {

    private NameNormalizer() {
        // Utility class; not instantiable.
    }

    /**
     * Normalize {@code input} to its case-folded, diacritic-stripped form.
     *
     * @param input the raw text (may be {@code null})
     * @return the normalized key; the empty string when {@code input} is {@code null}
     */
    public static String normalize(String input) {
        if (input == null) {
            return "";
        }
        // 1) Case-fold (locale-independent).
        String folded = input.toLowerCase(Locale.ROOT);
        // 2) đ/Đ → d (đ has no canonical decomposition; only lowercase đ remains after folding).
        folded = folded.replace('đ', 'd');
        // 3) Decompose to NFD so diacritics become standalone combining marks.
        String decomposed = Normalizer.normalize(folded, Normalizer.Form.NFD);
        // 4) Strip combining (non-spacing) marks, keeping only base letters.
        StringBuilder sb = new StringBuilder(decomposed.length());
        for (int i = 0; i < decomposed.length(); i++) {
            char c = decomposed.charAt(i);
            if (Character.getType(c) != Character.NON_SPACING_MARK) {
                sb.append(c);
            }
        }
        return sb.toString();
    }

    /**
     * Whether {@code text} contains {@code query} as a case-folded, diacritic-insensitive substring
     * (Requirement 16.1). Both operands are {@link #normalize(String) normalized} before the
     * substring test.
     *
     * @param text  the candidate text (e.g. a person's display name)
     * @param query the search query
     * @return {@code true} iff the normalized {@code text} contains the normalized {@code query}
     */
    public static boolean containsNormalized(String text, String query) {
        return normalize(text).contains(normalize(query));
    }
}
