package com.example.customer_vehicle_service.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Size;

import java.util.UUID;

/**
 * Request cập nhật hồ sơ khách hàng — cập nhật một phần.
 *
 * <p>Field null được bỏ qua, nên không dùng {@code @NotBlank} ở đây: gửi body
 * chỉ đổi số điện thoại vẫn hợp lệ. Ông có giá trị rỗng sẽ chặn ở
 * {@code @Size}/{@code @Email} hoặc bị ghi đè theo luật của service.
 */
public record CustomerUpdateRequest(
        @Size(min = 1, max = 150, message = "Họ tên phải từ 1 đến 150 ký tự")
        String fullName,

        @Size(min = 1, max = 20, message = "Số điện thoại phải từ 1 đến 20 ký tự")
        String phone,

        @Email(message = "Email không hợp lệ")
        @Size(max = 255, message = "Email tối đa 255 ký tự")
        String email,

        @Size(max = 500, message = "Địa chỉ tối đa 500 ký tự")
        String address,

        String notes,

        /**
         * Cho phép liên kết hoặc gỡ liên kết tài khoản: gửi {@code null} giữ
         * nguyên, gửi giá trị hợp lệ để thay. Xem thêm {@code CustomerServiceImpl}.
         */
        UUID userId,

        Boolean isActive
) {
}