package com.example.notification_service.integration.contract;

import java.util.UUID;

public record StaffProfileResponse(
        UUID id,
        UUID userId,
        String fullName,
        String phone,
        String email,
        Boolean isActive
) {
}
