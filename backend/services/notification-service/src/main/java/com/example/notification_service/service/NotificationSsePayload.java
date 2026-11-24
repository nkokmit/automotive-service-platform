package com.example.notification_service.service;

import com.example.notification_service.enums.NotificationCategory;

import java.time.Instant;
import java.util.UUID;

public record NotificationSsePayload(
        UUID id,
        String title,
        String content,
        NotificationCategory category,
        Instant createdAt
) {
}
