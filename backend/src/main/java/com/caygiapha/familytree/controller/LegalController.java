package com.caygiapha.familytree.controller;

import com.caygiapha.familytree.dto.LegalDocumentResponse;
import com.caygiapha.familytree.service.ConsentService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Public legal-document endpoints (Requirement 23.1): the current Terms of Service and Privacy
 * Policy, reachable without authentication so a visitor can read them before signing up.
 *
 * <ul>
 *   <li>{@code GET /api/v1/legal/tos} — the current Terms of Service.</li>
 *   <li>{@code GET /api/v1/legal/privacy} — the current Privacy Policy.</li>
 * </ul>
 */
@RestController
@RequestMapping("/api/v1/legal")
public class LegalController {

    private final ConsentService consentService;

    public LegalController(ConsentService consentService) {
        this.consentService = consentService;
    }

    @GetMapping("/tos")
    public LegalDocumentResponse tos() {
        return LegalDocumentResponse.from(consentService.currentDocument(ConsentService.TOS));
    }

    @GetMapping("/privacy")
    public LegalDocumentResponse privacy() {
        return LegalDocumentResponse.from(consentService.currentDocument(ConsentService.PRIVACY));
    }
}
