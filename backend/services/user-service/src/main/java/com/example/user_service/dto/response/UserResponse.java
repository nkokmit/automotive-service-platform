package com.example.user_service.dto.response;

import java.util.Set;
import java.util.UUID;

public record UserResponse(
        UUID id,
        String username,
        String email,
        String fullName,
        Boolean isActive,
        Set<RoleResponse> roles
) {
}
