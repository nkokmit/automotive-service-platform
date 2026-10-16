package com.example.customer_vehicle_service.mapper;

import com.example.customer_vehicle_service.dto.response.VehicleResponse;
import com.example.customer_vehicle_service.entity.Vehicle;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

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
     * Chỉ {@code customerId} cần khai báo tay: entity lưu quan hệ
     * {@code Vehicle.customer} nên không có field {@code customerId} thuần.
     * {@code modelYear} kiểu {@code Short} ở cả entity lẫn DTO nên MapStruct map
     * thẳng, và {@code deletedAt} cố ý không xuất hiện trong DTO.
     */
    @Mapping(source = "customer.id", target = "customerId")
    VehicleResponse toVehicleResponse(Vehicle vehicle);
}