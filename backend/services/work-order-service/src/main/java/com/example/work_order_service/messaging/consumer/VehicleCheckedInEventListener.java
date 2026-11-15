package com.example.work_order_service.messaging.consumer;

import com.example.work_order_service.messaging.event.VehicleCheckedInEvent;
import com.example.work_order_service.service.WorkOrderCheckInEventHandler;
import lombok.RequiredArgsConstructor;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class VehicleCheckedInEventListener {

    private final WorkOrderCheckInEventHandler eventHandler;

    @KafkaListener(
            topics = "${app.kafka.topics.vehicle-checked-in:vehicle-checked-in}",
            groupId = "${spring.kafka.consumer.group-id:work-order-service}",
            properties = {
                    "spring.json.value.default.type=com.example.work_order_service.messaging.event.VehicleCheckedInEvent",
                    "spring.json.use.type.headers=false",
                    "spring.json.trusted.packages=com.example.work_order_service.messaging.event"
            }
    )
    public void onVehicleCheckedIn(VehicleCheckedInEvent event) {
        eventHandler.handle(event);
    }
}
