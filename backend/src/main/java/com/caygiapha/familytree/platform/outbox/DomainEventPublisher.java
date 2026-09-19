package com.caygiapha.familytree.platform.outbox;

/**
 * Outbound port: persist an event in the same transaction as the graph write, then notify
 * in-process listeners after commit.
 */
public interface DomainEventPublisher {

    void publish(GraphMutatedEvent event);
}
