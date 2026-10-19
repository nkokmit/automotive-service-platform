package com.example.user_service.event;

import java.util.UUID;

public record UserRegisteredEvent(
        UUID userId,
        String username,
        String fullName,
        String email,
        String phone
) {
}
