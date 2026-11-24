package com.example.notification_service.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record UpdateNotificationTemplateRequest(
        String subjectTemplate,
        @NotBlank String bodyTemplate,
        @NotNull Boolean isActive
) {
}
