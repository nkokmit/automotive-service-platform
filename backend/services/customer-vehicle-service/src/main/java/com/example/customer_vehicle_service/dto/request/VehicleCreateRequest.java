package com.example.customer_vehicle_service.dto.request;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;

/**
 * Request tạo hồ sơ xe (PLAN.md bước 4).
 *
 * <p>Cố ý KHÔNG có {@code customerId}: xe không thuộc về khách hàng nào
 * ({@code V3__decouple_customer_from_vehicle.sql}). Khách hàng gắn với xe qua
 * từng lần tiếp nhận, ghi ở
 * {@link com.example.customer_vehicle_service.dto.request.ServiceHistoryCreateRequest}.
 *
 * <p>Ràng buộc {@code @Size} bám theo độ rộng cột trong
 * {@code V1__create_customer_vehicle_tables.sql} để validation ở tầng API báo lỗi
 * sớm, thay vì để MySQL chặn bằng lỗi constraint.
 */
public record VehicleCreateRequest(
        @Size(max = 20, message = "Biển số xe tối đa 20 ký tự")
        @NotBlank(message = "Biển số xe không được để trống")
        String licensePlate,

        /**
         * VIN luôn dài 17 ký tự theo chuẩn, nên ràng buộc min = max thay vì chỉ
         * kiểm tra độ dài tối đa. Tuỳ chọn vì cột cho phép NULL.
         */
        @Pattern(regexp = "\\S{17}", message = "VIN phải đúng 17 ký tự không chứa khoảng trắng")
        @Size(min = 17, max = 17, message = "VIN phải đúng 17 ký tự")
        String vin,

        @Size(max = 100, message = "Hãng xe tối đa 100 ký tự")
        @NotBlank(message = "Hãng xe không được để trống")
        String make,

        @Size(max = 100, message = "Dòng xe tối đa 100 ký tự")
        @NotBlank(message = "Dòng xe không được để trống")
        String model,

        /**
         * Năm sản xuất hợp lệ: chặn năm vô nghĩa (0, âm, xa tương lai) để dữ liệu
         * không phá vỡ các phép tính tuổi xe về sau.
         */
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

        /**
         * Số km không được âm — cột là {@code INT UNSIGNED} nên MySQL sẽ chặn, nhưng
         * cần báo lỗi rõ ràng ở tầng API.
         */
        @PositiveOrZero(message = "Số km không được âm")
        Integer odometerKm,

        String notes,

        Boolean isActive
) {
}