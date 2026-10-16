package com.example.customer_vehicle_service.dto.request;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;

import java.util.UUID;

/**
 * Request cập nhật hồ sơ xe — cập nhật một phần (PLAN.md bước 4).
 *
 * <p>Field null được bỏ qua. {@code @Pattern} chặn chuỗi toàn khoảng trắng
 * khi cập nhật các field bắt buộc nhưng vẫn cho phép bỏ qua field bằng null.
 * {@code @Size} giới hạn độ dài theo schema.
 */
public record VehicleUpdateRequest(
        @Pattern(regexp = "(?s).*\\S.*", message = "Biển số xe không được để trống")
        @Size(min = 1, max = 20, message = "Biển số xe phải từ 1 đến 20 ký tự")
        String licensePlate,

        @Pattern(regexp = "\\S{17}", message = "VIN phải đúng 17 ký tự không chứa khoảng trắng")
        @Size(min = 17, max = 17, message = "VIN phải đúng 17 ký tự")
        String vin,

        @Pattern(regexp = "(?s).*\\S.*", message = "Hãng xe không được để trống")
        @Size(min = 1, max = 100, message = "Hãng xe phải từ 1 đến 100 ký tự")
        String make,

        @Pattern(regexp = "(?s).*\\S.*", message = "Dòng xe không được để trống")
        @Size(min = 1, max = 100, message = "Dòng xe phải từ 1 đến 100 ký tự")
        String model,

        @Min(value = 1900, message = "Năm sản xuất phải từ 1900 trở lên")
        @Max(value = 2100, message = "Năm sản xuất không vượt quá 2100")
        Short modelYear,

        @Size(max = 100, message = "Phiên bản tối đa 100 ký tự")
        String trim,

        @Size(max = 50, message = "Màu sắc tối đa 50 ký tự")
        String color,

        @Size(max = 30, message = "Loại nhiên liệu tối đa 30 ký tự")
        String fuelType,

        @Size(max = 30, message = "Loại hộp số tối đa 30 ký tự")
        String transmission,

        @PositiveOrZero(message = "Số km không được âm")
        Integer odometerKm,

        String notes,

        Boolean isActive,

        /**
         * Chuyển chủ sở hữu hiện tại. Gửi {@code null} giữ nguyên; gửi id khác thì
         * đổi sang khách hàng mới sau khi xác minh hồ sơ đó tồn tại và còn hoạt
         * động (PLAN.md bước 4). Gửi lại chính id hiện tại là thao tác không đổi
         * nên bỏ qua việc tra cứu.
         */
        UUID customerId
) {
}