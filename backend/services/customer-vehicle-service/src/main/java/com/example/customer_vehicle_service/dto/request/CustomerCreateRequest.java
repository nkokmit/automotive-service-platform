package com.example.customer_vehicle_service.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.util.UUID;

/**
 * Request tạo hồ sơ khách hàng.
 *
 * <p>Ràng buộc {@code @Size} bám theo độ rộng cột trong
 * {@code V1__create_customer_vehicle_tables.sql} để validation ở tầng API báo lỗi
 * sớm, thay vì để MySQL chặn bằng lỗi constraint.
 */
public record CustomerCreateRequest(
        @Size(max = 150, message = "Họ tên tối đa 150 ký tự")
        @NotBlank(message = "Họ tên không được để trống")
        String fullName,

        @Size(max = 20, message = "Số điện thoại tối đa 20 ký tự")
        @NotBlank(message = "Số điện thoại không được để trống")
        String phone,

        @Email(message = "Email không hợp lệ")
        @Size(max = 255, message = "Email tối đa 255 ký tự")
        String email,

        @Size(max = 500, message = "Địa chỉ tối đa 500 ký tự")
        String address,

        String notes,

        /**
         * ID tài khoản ở user-service. Tuỳ chọn: hồ sơ khách hàng có thể được
         * tạo bởi nhân viên khi khách chưa có tài khoản trên hệ thống.
         */
        UUID userId,

        Boolean isActive
) {
}