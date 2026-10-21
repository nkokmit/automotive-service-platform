package com.example.customer_vehicle_service.dto.request;

import com.example.customer_vehicle_service.enums.ServiceRecordType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PastOrPresent;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;

import java.time.Instant;
import java.util.UUID;

/**
 * Request tạo bản ghi lịch sử bảo dưỡng (PLAN.md bước 5).
 *
 * <p>Cố ý <b>không có</b> field {@code workOrderId}: bản ghi sinh ra từ Work Order
 * của hệ thống (loại {@code GARAGE_SERVICE}) chỉ được tạo bởi Kafka consumer ở bước
 * 6, không mở đường cho client tự gán ID để giả bản ghi. Ràng buộc này được
 * enforce ở tầng DTO (thiếu hẳn field) chứ không dựa vào kiểm tra ở service —
 * JSON gửi kèm {@code workOrderId} sẽ bị Jackson bỏ qua theo mặc định.
 *
 * <p>Vì vậy {@code recordType} chỉ nhận giá trị ngoài hệ thống
 * ({@code EXTERNAL_SERVICE}, {@code CUSTOMER_REPORTED}); loại
 * {@code GARAGE_SERVICE} bị chặn ở {@code ServiceHistoryServiceImpl}.
 *
 * <p>Có {@code customerId} tuỳ chọn: khách hàng đã mang xe đến lần tiếp nhận này.
 * Đây là nơi duy nhất liên kết Customer với Vehicle
 * ({@code V3__decouple_customer_from_vehicle.sql}) — không phải chỉ số "xe này
 * của khách này", mà là "lần mang xe tới này của khách này", nên cùng một xe có
 * thể được nhập nhiều lần với các {@code customerId} khác nhau.
 *
 * <p>Ràng buộc {@code @Size} bám theo độ rộng cột trong
 * {@code V1__create_customer_vehicle_tables.sql} để validation ở tầng API báo lỗi
 * sớm, thay vì để MySQL chặn bằng lỗi constraint.
 */
public record ServiceHistoryCreateRequest(
        /**
         * Khách hàng đã mang xe đến lần tiếp nhận này. Tuỳ chọn: bỏ trống khi
         * không rõ ai mang xe tới (xe gửi hộ, bản ghi nhập hậu kỳ từ hồ sơ giấy).
         *
         * <p>Không có {@code @NotNull} vì cột cho phép NULL và dữ liệu thực tế có
         * trường hợp này. Nếu gửi id thì khách hàng phải tồn tại — kiểm tra ở
         * {@code ServiceHistoryServiceImpl}. Cố ý KHÔNG yêu cầu còn hoạt động:
         * {@code isActive = FALSE} nghĩa là "đang gửi xe đi bảo dưỡng", đúng cái
         * tình huống ta đang ghi bản ghi này.
         */
        UUID customerId,

        /**
         * Nguồn bản ghi. Chỉ chấp nhận {@code EXTERNAL_SERVICE} hoặc
         * {@code CUSTOMER_REPORTED} — {@code GARAGE_SERVICE} dành cho hệ thống.
         */
        @NotNull(message = "Loại bản ghi không được để trống")
        ServiceRecordType recordType,

        /**
         * Ngày thực hiện dịch vụ. Chặn tương lai vì lịch sử là dữ liệu đã xảy ra;
         * nhân viên nhập hậu kỳ vẫn hợp lệ nên không chặn ngày quá khứ.
         */
        @NotNull(message = "Ngày dịch vụ không được để trống")
        @PastOrPresent(message = "Ngày dịch vụ không được ở tương lai")
        Instant serviceDate,

        /**
         * Số km của xe tại thời điểm dịch vụ. Không được âm vì cột là
         * {@code INT UNSIGNED}.
         */
        @PositiveOrZero(message = "Số km không được âm")
        Integer odometerKm,

        /**
         * Tóm tắt ngắn gọn — hạng mục chính đã thực hiện. Chi tiết hạng mục,
         * phụ tùng, báo giá, hoá đơn cố ý không lưu ở service này (PLAN.md bước 5).
         */
        @Size(max = 255, message = "Tóm tắt tối đa 255 ký tự")
        @NotBlank(message = "Tóm tắt không được để trống")
        String summary,

        String description,

        @Size(max = 150, message = "Tên gara tối đa 150 ký tự")
        String garageName
) {
}