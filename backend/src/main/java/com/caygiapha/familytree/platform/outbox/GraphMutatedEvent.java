package com.caygiapha.familytree.platform.outbox;

import java.time.Instant;
import java.util.UUID;

/**
 * Domain event emitted after a successful graph mutation. Primitive edges remain the only
 * persisted relationships; this event only notifies cache/audit adapters.
 */
public record GraphMutatedEvent(
        UUID treeId,
        UUID relationshipId,
        String edgeType,
        Instant occurredAt) {

    public static GraphMutatedEvent edgeCreated(UUID treeId, UUID relationshipId, String edgeType) {
        return new GraphMutatedEvent(treeId, relationshipId, edgeType, Instant.now());
    }
}
