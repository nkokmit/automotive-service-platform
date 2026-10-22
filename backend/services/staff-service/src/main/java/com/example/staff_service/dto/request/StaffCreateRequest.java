package com.example.staff_service.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.util.UUID;

public record StaffCreateRequest(
        UUID userId,

        @NotBlank(message = "Mã nhân viên không được để trống")
        @Size(max = 50, message = "Mã nhân viên tối đa 50 ký tự")
        String employeeCode,

        @NotBlank(message = "Họ tên không được để trống")
        @Size(max = 150, message = "Họ tên tối đa 150 ký tự")
        String fullName,

        @Size(max = 20, message = "Số điện thoại tối đa 20 ký tự")
        String phone,

        @Email(message = "Email không hợp lệ")
        @Size(max = 255, message = "Email tối đa 255 ký tự")
        String email,

        @Size(max = 100, message = "Chức vụ tối đa 100 ký tự")
        String position,

        Boolean isActive
) {
}
