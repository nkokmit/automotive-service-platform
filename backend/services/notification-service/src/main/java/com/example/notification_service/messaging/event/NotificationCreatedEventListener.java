package com.example.notification_service.messaging.event;

import com.example.notification_service.service.SseEmitterRegistry;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

@Component
@RequiredArgsConstructor
public class NotificationCreatedEventListener {

    private final SseEmitterRegistry sseEmitterRegistry;

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onNotificationCreated(NotificationCreatedEvent event) {
        sseEmitterRegistry.publish(event.recipientId(), event.notification());
    }
}
