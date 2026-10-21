package com.example.customer_vehicle_service.messaging;

import com.example.customer_vehicle_service.service.CustomerRegistrationEventHandler;
import lombok.RequiredArgsConstructor;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class UserRegisteredEventListener {

    private final CustomerRegistrationEventHandler eventHandler;

    @KafkaListener(
            topics = "${app.kafka.topics.user-registered:user-registered}",
            groupId = "${spring.kafka.consumer.group-id:customer-vehicle-service}"
    )
    public void onUserRegistered(UserRegisteredEvent event) {
        eventHandler.handle(event);
    }
}
