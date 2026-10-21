package com.example.customer_vehicle_service.mapper;

import com.example.customer_vehicle_service.dto.response.ServiceHistoryResponse;
import com.example.customer_vehicle_service.entity.VehicleServiceHistory;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

/**
 * MapStruct mapper cho Entity → DTO của lịch sử bảo dưỡng (PLAN.md bước 5).
 *
 * <p>Sinh code mapping tại compile-time nên không dùng reflection, giống
 * {@code CustomerMapper} và {@code VehicleMapper}.
 *
 * <p>Chỉ map chiều đọc. Chiều ghi được xử lý thủ công trong
 * {@code ServiceHistoryServiceImpl} vì {@link VehicleServiceHistory} dùng Lombok
 * {@code @Builder} cùng {@code @PrePersist} để quản lý {@code created_at}.
 */
@Mapper(componentModel = "spring", unmappedTargetPolicy = org.mapstruct.ReportingPolicy.IGNORE)
public interface ServiceHistoryMapper {

    /**
     * Chỉ {@code vehicleId} cần khai báo tay: entity lưu quan hệ
     * {@code VehicleServiceHistory.vehicle} nên không có field {@code vehicleId}
     * thuần. {@code customerId} thì map thẳng vì entity lưu UUID thuần (không
     * phải {@code @ManyToOne}) — xem javadoc entity để biết vì sao.
     */
    @Mapping(source = "vehicle.id", target = "vehicleId")
    ServiceHistoryResponse toServiceHistoryResponse(VehicleServiceHistory history);
}