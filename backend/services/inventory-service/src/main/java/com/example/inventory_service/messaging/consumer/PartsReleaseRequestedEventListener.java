package com.example.inventory_service.messaging.consumer;

import com.example.inventory_service.messaging.event.PartsReleaseRequestedEvent;
import com.example.inventory_service.service.PartsReleaseRequestHandler;
import lombok.RequiredArgsConstructor;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class PartsReleaseRequestedEventListener {

    private final PartsReleaseRequestHandler requestHandler;

    @KafkaListener(
            topics = "${app.kafka.topics.parts-release-requested:parts-release-requested}",
            groupId = "${app.kafka.consumer.group-id:inventory-service}",
            properties = {
                    "spring.json.value.default.type=com.example.inventory_service.messaging.event.PartsReleaseRequestedEvent",
                    "spring.json.use.type.headers=false",
                    "spring.json.trusted.packages=com.example.inventory_service.messaging.event"
            }
    )
    public void onPartsReleaseRequested(PartsReleaseRequestedEvent event) {
        requestHandler.release(event);
    }
}
