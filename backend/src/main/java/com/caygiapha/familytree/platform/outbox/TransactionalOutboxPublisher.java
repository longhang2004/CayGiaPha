package com.caygiapha.familytree.platform.outbox;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.Clock;
import java.time.Instant;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Component;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

@Component
public class TransactionalOutboxPublisher implements DomainEventPublisher {

    private static final Logger log = LoggerFactory.getLogger(TransactionalOutboxPublisher.class);

    private final OutboxRepository outboxRepository;
    private final ApplicationEventPublisher applicationEventPublisher;
    private final ObjectMapper objectMapper;
    private final Clock clock;

    public TransactionalOutboxPublisher(
            OutboxRepository outboxRepository,
            ApplicationEventPublisher applicationEventPublisher,
            ObjectMapper objectMapper,
            Clock clock) {
        this.outboxRepository = outboxRepository;
        this.applicationEventPublisher = applicationEventPublisher;
        this.objectMapper = objectMapper;
        this.clock = clock;
    }

    @Override
    public void publish(GraphMutatedEvent event) {
        OutboxMessage message = new OutboxMessage(
                "family-graph",
                event.treeId(),
                "graph.mutated",
                serialize(event));
        OutboxMessage saved = outboxRepository.save(message);
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    dispatch(saved, event);
                }
            });
        } else {
            dispatch(saved, event);
        }
    }

    void dispatch(OutboxMessage saved, GraphMutatedEvent event) {
        applicationEventPublisher.publishEvent(event);
        saved.markPublished(Instant.now(clock));
        outboxRepository.save(saved);
        log.info(
                "Published graph mutated outbox event id={} treeId={} type={}",
                saved.getId(),
                event.treeId(),
                event.edgeType());
    }

    private String serialize(GraphMutatedEvent event) {
        try {
            return objectMapper.writeValueAsString(event);
        } catch (JsonProcessingException ex) {
            throw new IllegalStateException("Unable to serialize graph mutated event", ex);
        }
    }
}
