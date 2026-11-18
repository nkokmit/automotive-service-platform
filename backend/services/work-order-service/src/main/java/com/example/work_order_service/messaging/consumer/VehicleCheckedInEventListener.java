package com.example.work_order_service.messaging.consumer;

import com.example.work_order_service.messaging.event.VehicleCheckedInEvent;
import com.example.work_order_service.service.InboxEventService;
import com.example.work_order_service.service.WorkOrderCheckInEventHandler;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
@RequiredArgsConstructor
public class VehicleCheckedInEventListener {

    private final InboxEventService inboxEventService;
    private final WorkOrderCheckInEventHandler eventHandler;

    @Value("${app.kafka.topics.vehicle-checked-in:vehicle-checked-in}")
    private String topic;

    @KafkaListener(
            topics = "${app.kafka.topics.vehicle-checked-in:vehicle-checked-in}",
            groupId = "${spring.kafka.consumer.group-id:work-order-service}",
            properties = {
                    "spring.json.value.default.type=com.example.work_order_service.messaging.event.VehicleCheckedInEvent",
                    "spring.json.use.type.headers=false",
                    "spring.json.trusted.packages=com.example.work_order_service.messaging.event"
            }
    )
    @Transactional
    public void onVehicleCheckedIn(VehicleCheckedInEvent event) {
        if (event == null) {
            throw new IllegalArgumentException("VehicleCheckedInEvent is required");
        }
        if (!inboxEventService.markProcessed(
                event.eventId(), topic, VehicleCheckedInEvent.class.getSimpleName(), event.bookingId())) {
            return;
        }
        eventHandler.handle(event);
    }
}
