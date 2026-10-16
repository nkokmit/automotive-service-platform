package com.example.customer_vehicle_service.mapper;

import com.example.customer_vehicle_service.dto.response.CustomerResponse;
import com.example.customer_vehicle_service.entity.Customer;
import org.mapstruct.Mapper;

/**
 * MapStruct mapper cho Entity ↔ DTO của hồ sơ khách hàng.
 *
 * <p>Sinh code mapping tại compile-time nên không dùng reflection, giống
 * {@code EntityMapper} của user-service.
 *
 * <p>Chỉ map chiều đọc (Entity → DTO). Chiều ghi được xử lý thủ công trong
 * {@code CustomerServiceImpl} vì {@link Customer} dùng Lombok
 * {@code @Builder} cùng {@code @PrePersist}/{@code @PreUpdate} để quản lý
 * {@code created_at}/{@code updated_at} — gán qua builder sẽ bỏ qua các hook
 * đó.
 */
@Mapper(componentModel = "spring", unmappedTargetPolicy = org.mapstruct.ReportingPolicy.IGNORE)
public interface CustomerMapper {

    /**
     * Tên field của {@link Customer} và {@link CustomerResponse} khớp 1-1 nên
     * không cần khai báo {@code @Mapping} thủ công.
     */
    CustomerResponse toCustomerResponse(Customer customer);
}