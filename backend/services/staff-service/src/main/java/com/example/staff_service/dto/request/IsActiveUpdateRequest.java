package com.example.staff_service.dto.request;

import jakarta.validation.constraints.NotNull;

public record IsActiveUpdateRequest(
        @NotNull(message = "isActive không được để trống")
        Boolean isActive
) {
}
