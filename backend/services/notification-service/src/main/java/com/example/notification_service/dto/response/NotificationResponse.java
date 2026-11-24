package com.example.notification_service.dto.response;

import com.example.notification_service.enums.NotificationCategory;

import java.time.Instant;
import java.util.UUID;

public record NotificationResponse(
        UUID id,
        NotificationCategory category,
        String title,
        String content,
        String referenceType,
        UUID referenceId,
        Boolean isRead,
        Instant readAt,
        Instant createdAt
) {
}
