package com.caygiapha.familytree.dto;

import com.caygiapha.familytree.entity.PersonPhoto;
import java.util.UUID;

/**
 * Metadata for a stored person photo (Requirement 24). The bytes are fetched separately from the
 * gated serving endpoint; this carries only the reference metadata.
 */
public record PhotoResponse(
        UUID id,
        UUID personId,
        String contentType,
        long byteSize,
        Integer width,
        Integer height,
        boolean primary) {

    public static PhotoResponse from(PersonPhoto p) {
        return new PhotoResponse(
                p.getId(), p.getPersonId(), p.getContentType(), p.getByteSize(),
                p.getWidth(), p.getHeight(), p.isPrimary());
    }
}
