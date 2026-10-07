package com.example.user_service.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Size;

import java.util.Set;
import java.util.UUID;

public record UserUpdateRequest(
        @Size(min = 3, max = 50, message = "Username phải từ 3 đến 50 ký tự")
        String username,

        @Size(min = 6, max = 100, message = "Password phải từ 6 đến 100 ký tự")
        String password,

        @Email(message = "Email không hợp lệ")
        String email,

        @Size(max = 100, message = "Họ tên tối đa 100 ký tự")
        String fullName,

        Boolean isActive,

        Set<UUID> roleIds
) {
}
