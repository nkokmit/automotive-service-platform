package com.example.inventory_service.messaging.consumer;

import com.example.inventory_service.exception.ApiException;
import com.example.inventory_service.messaging.event.PartsReservationRequestedEvent;
import com.example.inventory_service.service.PartsReservationRequestHandler;
import com.example.inventory_service.service.PartsReservationFailureHandler;
import com.example.inventory_service.service.PartsReservationOutcome;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Component;

import java.util.concurrent.ExecutionException;

@Component
@RequiredArgsConstructor
@Slf4j
public class PartsReservationRequestedEventListener {

    private final PartsReservationRequestHandler requestHandler;
    private final PartsReservationFailureHandler failureHandler;
    private final KafkaTemplate<String, Object> kafkaTemplate;

    @Value("${app.kafka.topics.parts-reserved:parts-reserved}")
    private String reservedTopic;

    @Value("${app.kafka.topics.parts-reservation-failed:parts-reservation-failed}")
    private String failedTopic;

    @KafkaListener(
            topics = "${app.kafka.topics.parts-reservation-requested:parts-reservation-requested}",
            groupId = "${app.kafka.consumer.group-id:inventory-service}",
            properties = {
                    "spring.json.value.default.type=com.example.inventory_service.messaging.event.PartsReservationRequestedEvent",
                    "spring.json.use.type.headers=false",
                    "spring.json.trusted.packages=com.example.inventory_service.messaging.event"
            }
    )
    public void onReservationRequested(PartsReservationRequestedEvent event) {
        PartsReservationOutcome outcome;
        try {
            outcome = requestHandler.reserve(event);
        } catch (ApiException exception) {
            outcome = failureHandler.recordFailure(event, exception.getMessage());
        }
        if (outcome instanceof PartsReservationOutcome.Reserved reserved) {
            send(reservedTopic, reserved.event().workOrderId().toString(), reserved.event());
        } else if (outcome instanceof PartsReservationOutcome.Failed failed) {
            send(failedTopic, failed.event().workOrderId().toString(), failed.event());
            log.warn("Parts reservation failed for Work Order {}: {}",
                    failed.event().workOrderId(), failed.event().reason());
        }
    }

    private void send(String topic, String key, Object event) {
        try {
            kafkaTemplate.send(topic, key, event).get();
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException("Interrupted while publishing inventory reservation result", exception);
        } catch (ExecutionException exception) {
            throw new IllegalStateException("Could not publish inventory reservation result",
                    exception.getCause());
        }
    }
}
