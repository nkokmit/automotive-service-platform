package com.example.notification_service.dto.response;

import com.example.notification_service.enums.NotificationChannel;

import java.time.Instant;
import java.util.UUID;

public record NotificationTemplateResponse(
        UUID id,
        String code,
        NotificationChannel channel,
        String subjectTemplate,
        String bodyTemplate,
        Boolean isActive,
        Instant createdAt,
        Instant updatedAt
) {
}
