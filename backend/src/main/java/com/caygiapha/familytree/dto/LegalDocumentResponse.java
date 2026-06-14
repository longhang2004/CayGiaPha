package com.caygiapha.familytree.dto;

import com.caygiapha.familytree.entity.LegalDocument;

/**
 * Response for the public legal-document endpoints (Requirement 23.1): the document type, its
 * current version, and its body.
 *
 * @param docType {@code tos} or {@code privacy}
 * @param version the current version number
 * @param body    the document text
 */
public record LegalDocumentResponse(String docType, int version, String body) {

    public static LegalDocumentResponse from(LegalDocument doc) {
        return new LegalDocumentResponse(doc.getDocType(), doc.getVersion(), doc.getBody());
    }
}
