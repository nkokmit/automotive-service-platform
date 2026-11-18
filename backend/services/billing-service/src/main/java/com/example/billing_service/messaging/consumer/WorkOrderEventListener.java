package com.example.billing_service.messaging.consumer;

import com.example.billing_service.messaging.event.WorkOrderCanceledEvent;
import com.example.billing_service.messaging.event.WorkOrderCompletedEvent;
import com.example.billing_service.repository.ProcessedEventRepository;
import com.example.billing_service.service.InvoiceCancellationTransaction;
import com.example.billing_service.service.InvoiceCreationTransaction;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
@RequiredArgsConstructor
@Slf4j
public class WorkOrderEventListener {

    private final ProcessedEventRepository processedEventRepository;
    private final InvoiceCreationTransaction invoiceCreationTransaction;
    private final InvoiceCancellationTransaction invoiceCancellationTransaction;

    @Value("${app.kafka.topics.work-order-completed:work-order-completed}")
    private String completedTopic;

    @Value("${app.kafka.topics.work-order-canceled:work-order-canceled}")
    private String canceledTopic;

    @KafkaListener(
            topics = "${app.kafka.topics.work-order-completed:work-order-completed}",
            groupId = "${app.kafka.consumer.group-id:billing-service}",
            properties = {
                    "spring.json.value.default.type=com.example.billing_service.messaging.event.WorkOrderCompletedEvent",
                    "spring.json.use.type.headers=false",
                    "spring.json.trusted.packages=com.example.billing_service.messaging.event"
            }
    )
    @Transactional
    public void onWorkOrderCompleted(WorkOrderCompletedEvent event) {
        if (!markProcessed(event.eventId(), completedTopic, "WorkOrderCompletedEvent", event.workOrderId())) {
            return;
        }
        invoiceCreationTransaction.createFromCompletedEvent(event);
        log.info("Created invoice from Work Order completed event {} for Work Order {}",
                event.eventId(), event.workOrderId());
    }

    @KafkaListener(
            topics = "${app.kafka.topics.work-order-canceled:work-order-canceled}",
            groupId = "${app.kafka.consumer.group-id:billing-service}",
            properties = {
                    "spring.json.value.default.type=com.example.billing_service.messaging.event.WorkOrderCanceledEvent",
                    "spring.json.use.type.headers=false",
                    "spring.json.trusted.packages=com.example.billing_service.messaging.event"
            }
    )
    @Transactional
    public void onWorkOrderCanceled(WorkOrderCanceledEvent event) {
        if (!markProcessed(event.eventId(), canceledTopic, "WorkOrderCanceledEvent", event.workOrderId())) {
            return;
        }
        invoiceCancellationTransaction.cancelUnpaidInvoice(event);
        log.info("Processed Work Order canceled event {} for Work Order {}",
                event.eventId(), event.workOrderId());
    }

    private boolean markProcessed(
            java.util.UUID eventId,
            String topic,
            String eventType,
            java.util.UUID workOrderId
    ) {
        if (eventId == null) {
            throw new IllegalArgumentException("Kafka event must contain eventId");
        }
        return processedEventRepository.insertIfAbsent(
                eventId.toString(), topic, eventType, workOrderId.toString()) == 1;
    }
}
