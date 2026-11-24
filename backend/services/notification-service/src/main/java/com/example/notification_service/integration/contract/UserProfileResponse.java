package com.example.notification_service.integration.contract;

import java.util.UUID;

public record UserProfileResponse(
        UUID id,
        String email,
        String phone,
        String fullName,
        Boolean isActive
) {
}
