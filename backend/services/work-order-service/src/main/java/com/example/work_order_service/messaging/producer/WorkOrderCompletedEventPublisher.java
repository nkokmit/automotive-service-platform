package com.example.work_order_service.messaging.producer;

import com.example.work_order_service.messaging.event.WorkOrderCompletedEvent;
import com.example.work_order_service.service.OutboxEventService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class WorkOrderCompletedEventPublisher {

    private final OutboxEventService outboxEventService;

    @Value("${app.kafka.topics.work-order-completed:work-order-completed}")
    private String topic;

    public void publish(WorkOrderCompletedEvent event) {
        outboxEventService.add(
                "WORK_ORDER",
                event.workOrderId(),
                topic,
                WorkOrderCompletedEvent.class.getSimpleName(),
                event.eventId(),
                event);
    }
}
