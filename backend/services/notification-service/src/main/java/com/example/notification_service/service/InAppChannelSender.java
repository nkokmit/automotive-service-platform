package com.example.notification_service.service;

import com.example.notification_service.entity.Notification;
import com.example.notification_service.messaging.event.NotificationCreatedEvent;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;

@Service
public class InAppChannelSender {

    private final ApplicationEventPublisher eventPublisher;

    public InAppChannelSender(ApplicationEventPublisher eventPublisher) {
        this.eventPublisher = eventPublisher;
    }

    public void send(Notification notification) {
        NotificationSsePayload payload = new NotificationSsePayload(
                notification.getId(),
                notification.getTitle(),
                notification.getContent(),
                notification.getCategory(),
                notification.getCreatedAt()
        );
        eventPublisher.publishEvent(new NotificationCreatedEvent(notification.getRecipientId(), payload));
    }
}
