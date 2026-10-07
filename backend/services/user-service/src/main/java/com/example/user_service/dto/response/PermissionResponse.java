package com.example.user_service.dto.response;

import java.util.UUID;

public record PermissionResponse(
        UUID id,
        String name,
        String displayName,
        String description
) {
}
