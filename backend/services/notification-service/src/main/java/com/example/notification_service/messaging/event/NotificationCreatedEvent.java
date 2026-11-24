package com.example.notification_service.messaging.event;

import com.example.notification_service.service.NotificationSsePayload;

import java.util.UUID;

public record NotificationCreatedEvent(UUID recipientId, NotificationSsePayload notification) {
}
