package com.example.user_service.event;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

@Component
@RequiredArgsConstructor
@Slf4j
public class UserRegisteredKafkaPublisher {

    private final KafkaTemplate<String, UserRegisteredEvent> kafkaTemplate;

    @Value("${app.kafka.topics.user-registered:user-registered}")
    private String topic;

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void publish(UserRegisteredEvent event) {
        kafkaTemplate.send(topic, event.userId().toString(), event)
                .whenComplete((result, error) -> {
                    if (error != null) {
                        log.error("Không thể publish UserRegistered event cho userId={}",
                                event.userId(), error);
                        return;
                    }
                    log.info("Đã publish UserRegistered event cho userId={} vào topic={}",
                            event.userId(), topic);
                });
    }
}
