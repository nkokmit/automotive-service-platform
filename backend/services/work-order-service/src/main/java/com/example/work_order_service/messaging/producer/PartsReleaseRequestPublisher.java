package com.example.work_order_service.messaging.producer;

import com.example.work_order_service.messaging.event.PartsReleaseRequestedEvent;
import com.example.work_order_service.service.OutboxEventService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class PartsReleaseRequestPublisher {

    private final OutboxEventService outboxEventService;

    @Value("${app.kafka.topics.parts-release-requested:parts-release-requested}")
    private String topic;

    public void publish(PartsReleaseRequestedEvent event) {
        outboxEventService.add(
                "WORK_ORDER",
                event.workOrderId(),
                topic,
                PartsReleaseRequestedEvent.class.getSimpleName(),
                event.eventId(),
                event);
    }
}
