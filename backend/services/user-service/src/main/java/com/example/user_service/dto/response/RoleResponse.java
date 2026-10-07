package com.example.user_service.dto.response;

import java.util.Set;
import java.util.UUID;

public record RoleResponse(
        UUID id,
        String name,
        String displayName,
        String description,
        Set<PermissionResponse> permissions
) {
}
