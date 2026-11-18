package com.example.work_order_service.messaging.producer;

import com.example.work_order_service.messaging.event.PartsReservationRequestedEvent;
import com.example.work_order_service.service.OutboxEventService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class PartsReservationRequestPublisher {

    private final OutboxEventService outboxEventService;

    @Value("${app.kafka.topics.parts-reservation-requested:parts-reservation-requested}")
    private String topic;

    public void publish(PartsReservationRequestedEvent event) {
        outboxEventService.add(
                "WORK_ORDER",
                event.workOrderId(),
                topic,
                PartsReservationRequestedEvent.class.getSimpleName(),
                event.eventId(),
                event);
    }
}
