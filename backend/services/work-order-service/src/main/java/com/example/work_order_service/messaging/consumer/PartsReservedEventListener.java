package com.example.work_order_service.messaging.consumer;

import com.example.work_order_service.messaging.event.PartsReservedEvent;
import com.example.work_order_service.service.InboxEventService;
import com.example.work_order_service.service.PartsReservationResultHandler;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
@RequiredArgsConstructor
public class PartsReservedEventListener {

    private final InboxEventService inboxEventService;
    private final PartsReservationResultHandler resultHandler;

    @Value("${app.kafka.topics.parts-reserved:parts-reserved}")
    private String topic;

    @KafkaListener(
            topics = "${app.kafka.topics.parts-reserved:parts-reserved}",
            groupId = "${spring.kafka.consumer.group-id:work-order-service}",
            properties = {
                    "spring.json.value.default.type=com.example.work_order_service.messaging.event.PartsReservedEvent",
                    "spring.json.use.type.headers=false",
                    "spring.json.trusted.packages=com.example.work_order_service.messaging.event"
            }
    )
    @Transactional
    public void onPartsReserved(PartsReservedEvent event) {
        if (event == null) {
            throw new IllegalArgumentException("PartsReservedEvent is required");
        }
        if (!inboxEventService.markProcessed(
                event.eventId(), topic, PartsReservedEvent.class.getSimpleName(), event.workOrderId())) {
            return;
        }
        resultHandler.handleReserved(event);
    }
}
