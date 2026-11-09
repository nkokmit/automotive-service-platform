package com.example.work_order_service.messaging.consumer;

import com.example.work_order_service.messaging.event.PartsReservedEvent;
import com.example.work_order_service.service.PartsReservationResultHandler;
import lombok.RequiredArgsConstructor;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class PartsReservedEventListener {

    private final PartsReservationResultHandler resultHandler;

    @KafkaListener(
            topics = "${app.kafka.topics.parts-reserved:parts-reserved}",
            groupId = "${spring.kafka.consumer.group-id:work-order-service}",
            properties = {
                    "spring.json.value.default.type=com.example.work_order_service.messaging.event.PartsReservedEvent",
                    "spring.json.use.type.headers=false",
                    "spring.json.trusted.packages=com.example.work_order_service.messaging.event"
            }
    )
    public void onPartsReserved(PartsReservedEvent event) {
        resultHandler.handleReserved(event);
    }
}
