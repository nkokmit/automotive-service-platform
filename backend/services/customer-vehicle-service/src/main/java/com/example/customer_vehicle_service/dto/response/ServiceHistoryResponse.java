package com.example.customer_vehicle_service.dto.response;

import com.example.customer_vehicle_service.enums.ServiceRecordType;

import java.time.Instant;
import java.util.UUID;

/**
 * DTO trả về cho API lịch sử bảo dưỡng (PLAN.md bước 5).
 *
 * <p>Có {@code workOrderId} — khác {@link ServiceHistoryCreateRequest} — vì đây
 * là chiều đọc: client cần biết bản ghi nào đến từ Work Order nào của hệ thống.
 * Bản ghi nhập từ gara ngoài hoặc khách hàng có trường này là {@code null}.
 *
 * <p>Cố ý trả {@code vehicleId} chứ không trả tên xe/biển số: quan hệ
 * {@code VehicleServiceHistory.vehicle} là {@code LAZY} và {@code open-in-view}
 * đang tắt, nên đọc thêm thuộc tính sẽ phát sinh query không cần thiết cho mỗi
 * dòng khi phân trang — cùng lý do {@code VehicleResponse} chỉ trả
 * {@code customerId}.
 */
public record ServiceHistoryResponse(
        UUID id,
        UUID vehicleId,
        UUID workOrderId,
        ServiceRecordType recordType,
        Instant serviceDate,
        Integer odometerKm,
        String summary,
        String description,
        String garageName,
        Instant createdAt
) {
}