package com.example.customer_vehicle_service.mapper;

import com.example.customer_vehicle_service.dto.response.VehicleResponse;
import com.example.customer_vehicle_service.entity.Vehicle;
import org.mapstruct.Mapper;

/**
 * MapStruct mapper cho Entity → DTO của hồ sơ xe (PLAN.md bước 4).
 *
 * <p>Sinh code mapping tại compile-time nên không dùng reflection, giống
 * {@code CustomerMapper}.
 *
 * <p>Chỉ map chiều đọc. Chiều ghi được xử lý thủ công trong
 * {@code VehicleServiceImpl} vì {@link Vehicle} dùng Lombok {@code @Builder}
 * cùng {@code @PrePersist}/{@code @PreUpdate} để quản lý
 * {@code created_at}/{@code updated_at}.
 */
@Mapper(componentModel = "spring", unmappedTargetPolicy = org.mapstruct.ReportingPolicy.IGNORE)
public interface VehicleMapper {

    /**
     * Không cần khai báo tay bất kỳ {@code @Mapping} nào: entity {@code Vehicle}
     * không có quan hệ với customer nữa nên mọi field của DTO đều khớp tên 1-1
     * với entity. {@code deletedAt} cố ý không xuất hiện trong DTO.
     */
    VehicleResponse toVehicleResponse(Vehicle vehicle);
}