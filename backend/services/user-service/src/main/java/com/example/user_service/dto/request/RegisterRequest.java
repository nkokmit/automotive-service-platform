package com.example.user_service.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Request cho đăng ký tài khoản mới từ phía client.
 *
 * <p>Cố ý KHÔNG chứa {@code roleIds} và {@code isActive}: endpoint này public nên
 * client không được tự gán role (chống privilege escalation) hay tự kích hoạt
 * tài khoản. Role được service gán cứng {@code CUSTOMER}.
 */
public record RegisterRequest(
        @NotBlank(message = "Username không được để trống")
        @Size(min = 3, max = 50, message = "Username phải từ 3 đến 50 ký tự")
        String username,

        @NotBlank(message = "Password không được để trống")
        @Size(min = 6, max = 100, message = "Password phải từ 6 đến 100 ký tự")
        String password,

        @NotBlank(message = "Email không được để trống")
        @Email(message = "Email không hợp lệ")
        String email,

        @Size(max = 100, message = "Họ tên tối đa 100 ký tự")
        String fullName
) {
}
