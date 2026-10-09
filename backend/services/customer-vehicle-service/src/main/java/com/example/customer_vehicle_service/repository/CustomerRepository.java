package com.example.customer_vehicle_service.repository;

import com.example.customer_vehicle_service.entity.Customer;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface CustomerRepository extends JpaRepository<Customer, UUID> {

    /**
     * Tìm khách hàng theo tài khoản liên kết. Soft-deleted customer tự động bị
     * loại nhờ {@code @SQLRestriction}.
     */
    Optional<Customer> findByUserId(UUID userId);

    /**
     * Kiểm tra tài khoản đã được liên kết với khách hàng khác chưa.
     * Trả về true cả khi khách hàng đã xoá mềm, để không tái sử dụng được
     * tài khoản đã gắn với một hồ sơ lịch sử.
     */
    @Query(value = "SELECT COUNT(*) > 0 FROM customers WHERE user_id = :userId", nativeQuery = true)
    boolean existsByUserIdIncludingDeleted(@Param("userId") UUID userId);

    /**
     * Lấy khách hàng theo ID kể cả khi đã soft delete (native query để bypass
     * {@code @SQLRestriction}).
     */
    @Query(value = "SELECT * FROM customers WHERE id = :id", nativeQuery = true)
    Optional<Customer> findByIdRaw(@Param("id") UUID id);
}