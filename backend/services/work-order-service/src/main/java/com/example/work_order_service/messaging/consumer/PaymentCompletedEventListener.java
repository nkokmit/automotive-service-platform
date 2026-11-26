package com.example.work_order_service.messaging.consumer;

import com.example.work_order_service.messaging.event.PaymentCompletedEvent;
import com.example.work_order_service.service.InboxEventService;
import com.example.work_order_service.service.PaymentCompletedEventHandler;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
@RequiredArgsConstructor
public class PaymentCompletedEventListener {

    private final InboxEventService inboxEventService;
    private final PaymentCompletedEventHandler eventHandler;

    @Value("${app.kafka.topics.payment-completed:billing.payment-completed}")
    private String topic;

    @KafkaListener(
            topics = "${app.kafka.topics.payment-completed:billing.payment-completed}",
            groupId = "${spring.kafka.consumer.group-id:work-order-service}",
            properties = {
                    "spring.json.value.default.type=com.example.work_order_service.messaging.event.PaymentCompletedEvent",
                    "spring.json.use.type.headers=false",
                    "spring.json.trusted.packages=com.example.work_order_service.messaging.event"
            }
    )
    @Transactional
    public void onPaymentCompleted(PaymentCompletedEvent event) {
        if (event == null) {
            throw new IllegalArgumentException("PaymentCompletedEvent is required");
        }
        if (!inboxEventService.markProcessed(
                event.eventId(), topic, PaymentCompletedEvent.class.getSimpleName(), event.workOrderId())) {
            return;
        }
        eventHandler.handle(event);
    }
}
