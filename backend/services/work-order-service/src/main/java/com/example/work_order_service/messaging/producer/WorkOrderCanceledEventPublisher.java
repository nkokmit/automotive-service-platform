package com.example.work_order_service.messaging.producer;

import com.example.work_order_service.messaging.event.WorkOrderCanceledEvent;
import com.example.work_order_service.service.OutboxEventService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class WorkOrderCanceledEventPublisher {

    private final OutboxEventService outboxEventService;

    @Value("${app.kafka.topics.work-order-canceled:work-order-canceled}")
    private String topic;

    public void publish(WorkOrderCanceledEvent event) {
        outboxEventService.add(
                "WORK_ORDER",
                event.workOrderId(),
                topic,
                WorkOrderCanceledEvent.class.getSimpleName(),
                event.eventId(),
                event);
    }
}
