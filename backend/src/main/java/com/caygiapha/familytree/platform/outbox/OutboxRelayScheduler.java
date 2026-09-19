package com.caygiapha.familytree.platform.outbox;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.Clock;
import java.time.Instant;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * Relays unpublished outbox rows. Covers the crash window between commit and after-commit
 * dispatch, the same reliability story Kafka would provide at this scale.
 */
@Component
public class OutboxRelayScheduler {

    private static final Logger log = LoggerFactory.getLogger(OutboxRelayScheduler.class);

    private final OutboxRepository outboxRepository;
    private final ApplicationEventPublisher applicationEventPublisher;
    private final ObjectMapper objectMapper;
    private final Clock clock;

    public OutboxRelayScheduler(
            OutboxRepository outboxRepository,
            ApplicationEventPublisher applicationEventPublisher,
            ObjectMapper objectMapper,
            Clock clock) {
        this.outboxRepository = outboxRepository;
        this.applicationEventPublisher = applicationEventPublisher;
        this.objectMapper = objectMapper;
        this.clock = clock;
    }

    @Scheduled(fixedDelayString = "${app.outbox.relay-delay-ms:2000}")
    @Transactional
    public void relayUnpublished() {
        List<OutboxMessage> pending = outboxRepository.findTop50ByPublishedAtIsNullOrderByCreatedAtAsc();
        for (OutboxMessage message : pending) {
            try {
                GraphMutatedEvent event = objectMapper.readValue(message.getPayload(), GraphMutatedEvent.class);
                applicationEventPublisher.publishEvent(event);
                message.markPublished(Instant.now(clock));
                outboxRepository.save(message);
            } catch (Exception ex) {
                log.warn("Outbox relay skipped id={} type={}", message.getId(), message.getEventType());
            }
        }
    }
}
