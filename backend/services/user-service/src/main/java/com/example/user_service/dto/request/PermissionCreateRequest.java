package com.example.user_service.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record PermissionCreateRequest(
        @NotBlank(message = "Name không được để trống")
        @Size(min = 2, max = 50, message = "Name phải từ 2 đến 50 ký tự")
        String name,

        @Size(max = 100, message = "Display name tối đa 100 ký tự")
        String displayName,

        @Size(max = 255, message = "Mô tả tối đa 255 ký tự")
        String description
) {
}
