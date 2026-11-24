package com.example.notification_service.dto.request;

import com.example.notification_service.enums.NotificationCategory;
import com.example.notification_service.enums.RecipientType;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.util.UUID;

public record SendNotificationRequest(
        @NotNull RecipientType recipientType,
        @NotNull UUID recipientId,
        @NotNull NotificationCategory category,
        @NotBlank String title,
        @NotBlank String content,
        String referenceType,
        UUID referenceId,
        Boolean sendEmail,
        @Email String emailAddress
) {
}
