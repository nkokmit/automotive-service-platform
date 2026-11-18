package com.example.work_order_service.messaging.consumer;

import com.example.work_order_service.messaging.event.PartsReservationFailedEvent;
import com.example.work_order_service.service.InboxEventService;
import com.example.work_order_service.service.PartsReservationResultHandler;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
@RequiredArgsConstructor
public class PartsReservationFailedEventListener {

    private final InboxEventService inboxEventService;
    private final PartsReservationResultHandler resultHandler;

    @Value("${app.kafka.topics.parts-reservation-failed:parts-reservation-failed}")
    private String topic;

    @KafkaListener(
            topics = "${app.kafka.topics.parts-reservation-failed:parts-reservation-failed}",
            groupId = "${spring.kafka.consumer.group-id:work-order-service}",
            properties = {
                    "spring.json.value.default.type=com.example.work_order_service.messaging.event.PartsReservationFailedEvent",
                    "spring.json.use.type.headers=false",
                    "spring.json.trusted.packages=com.example.work_order_service.messaging.event"
            }
    )
    @Transactional
    public void onPartsReservationFailed(PartsReservationFailedEvent event) {
        if (event == null) {
            throw new IllegalArgumentException("PartsReservationFailedEvent is required");
        }
        if (!inboxEventService.markProcessed(event.eventId(), topic,
                PartsReservationFailedEvent.class.getSimpleName(), event.workOrderId())) {
            return;
        }
        resultHandler.handleFailed(event);
    }
}
