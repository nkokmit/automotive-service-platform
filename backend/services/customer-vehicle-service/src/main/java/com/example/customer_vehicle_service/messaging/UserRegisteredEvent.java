package com.example.customer_vehicle_service.messaging;

import java.util.UUID;

public record UserRegisteredEvent(
        UUID userId,
        String username,
        String fullName,
        String email,
        String phone
) {
}
