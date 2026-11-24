package com.example.customer_vehicle_service.messaging.consumer;

import com.example.customer_vehicle_service.messaging.event.WorkOrderCompletedEvent;
import com.example.customer_vehicle_service.service.WorkOrderCompletedEventHandler;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class WorkOrderCompletedEventListener {

    private final WorkOrderCompletedEventHandler eventHandler;

    @Value("${app.kafka.topics.work-order-completed:work-order-completed}")
    private String completedTopic;

    @KafkaListener(
            topics = "${app.kafka.topics.work-order-completed:work-order-completed}",
            groupId = "${spring.kafka.consumer.group-id:customer-vehicle-service}",
            properties = {
                    "spring.json.value.default.type=com.example.customer_vehicle_service.messaging.event.WorkOrderCompletedEvent",
                    "spring.json.use.type.headers=false",
                    "spring.json.trusted.packages=com.example.customer_vehicle_service.messaging.event"
            }
    )
    public void onWorkOrderCompleted(WorkOrderCompletedEvent event) {
        eventHandler.handle(event, completedTopic);
    }
}
