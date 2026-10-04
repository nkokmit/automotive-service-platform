package com.example.user_service.dto.request;

import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/**
 * Client gửi {@code name} KHÔNG bao gồm prefix {@code ROLE_} — service sẽ tự thêm.
 * Tất cả field đều optional trong update — chỉ validate khi được gửi lên.
 */
public record RoleUpdateRequest(
        @Size(min = 2, max = 50, message = "Name phải từ 2 đến 50 ký tự")
        @Pattern(
                regexp = "^[A-Z][A-Z0-9_]*$",
                message = "Name phải là UPPER_SNAKE_CASE (chữ hoa, số, gạch dưới; ví dụ ADMIN, STAFF, VIEW_REPORT)"
        )
        String name,

        @Size(max = 100, message = "Display name tối đa 100 ký tự")
        String displayName,

        @Size(max = 255, message = "Mô tả tối đa 255 ký tự")
        String description
) {
}
