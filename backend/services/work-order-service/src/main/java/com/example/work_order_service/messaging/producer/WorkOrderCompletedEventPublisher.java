package com.example.work_order_service.messaging.producer;

import com.example.work_order_service.messaging.event.WorkOrderCompletedEvent;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

@Component
@RequiredArgsConstructor
@Slf4j
public class WorkOrderCompletedEventPublisher {

    private final KafkaTemplate<String, Object> kafkaTemplate;

    @Value("${app.kafka.topics.work-order-completed:work-order-completed}")
    private String topic;

    public void publish(WorkOrderCompletedEvent event) {
        if (!TransactionSynchronizationManager.isSynchronizationActive()) {
            throw new IllegalStateException("Work Order completion events must be published within a transaction");
        }

        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() {
                kafkaTemplate.send(topic, event.workOrderId().toString(), event)
                        .whenComplete((result, failure) -> {
                            if (failure != null) {
                                log.error("Failed to publish Work Order completed event {}", event.eventId(), failure);
                                return;
                            }
                            log.info("Published Work Order completed event {} for Work Order {}",
                                    event.eventId(), event.workOrderId());
                        });
            }
        });
    }
}
