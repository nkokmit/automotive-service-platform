package com.example.customer_vehicle_service.repository;

import com.example.customer_vehicle_service.entity.Vehicle;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface VehicleRepository extends JpaRepository<Vehicle, UUID> {

    /**
     * Phân trang xe theo chủ sở hữu hiện tại. Soft-deleted vehicle tự động bị loại
     * nhờ {@code @SQLRestriction}.
     */
    Page<Vehicle> findByCustomerId(UUID customerId, Pageable pageable);

    /**
     * Kiểm tra VIN đã tồn tại chưa (chỉ xét xe chưa bị xoá).
     */
    boolean existsByVin(String vin);

    /**
     * Lấy xe theo ID kể cả khi đã soft delete (native query để bypass
     * {@code @SQLRestriction}).
     */
    @Query(value = "SELECT * FROM vehicles WHERE id = :id", nativeQuery = true)
    Optional<Vehicle> findByIdRaw(@Param("id") UUID id);

    /**
     * Đếm xe đang hoạt động của một khách hàng — dùng để chặn xoá mềm khách
     * hàng khi còn xe (PLAN.md bước 3). Soft-deleted vehicle bị loại nhờ
     * {@code @SQLRestriction}.
     */
    long countByCustomerIdAndIsActiveTrue(UUID customerId);
}