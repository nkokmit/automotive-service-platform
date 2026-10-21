package com.example.customer_vehicle_service.repository;

import com.example.customer_vehicle_service.entity.Customer;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
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
     * Tìm kiếm + phân trang khách hàng (PLAN.md bước 3).
     *
     * <p>Soft-deleted customer tự động bị loại nhờ {@code @SQLRestriction}.
     *
     * <p>{@code keyword} rỗng hoặc {@code null} thì bỏ qua điều kiện tìm kiếm;
     * {@code isActive} null thì bỏ qua điều kiện lọc trạng thái.
     *
     * <p>So khớp không phân biệt hoa thường bằng {@code LOWER(...)}; từ khoá
     * được bọc {@code %} để tìm theo chuỗi con.
     *
     * <p>Điều kiện {@code email IS NOT NULL} cần thiết vì email cho phép NULL —
     * không có nó thì {@code LOWER(email) LIKE ...} trả NULL (không phải TRUE)
     * và khách hàng không có email sẽ bị loại khỏi kết quả tìm kiếm.
     */
    @Query("""
            SELECT c FROM Customer c
            WHERE (:keyword IS NULL OR :keyword = ''
                   OR LOWER(c.fullName) LIKE LOWER(CONCAT('%', :keyword, '%'))
                   OR LOWER(c.phone) LIKE LOWER(CONCAT('%', :keyword, '%'))
                   OR (c.email IS NOT NULL
                       AND LOWER(c.email) LIKE LOWER(CONCAT('%', :keyword, '%'))))
              AND (:isActive IS NULL OR c.isActive = :isActive)
            """)
    Page<Customer> search(@Param("keyword") String keyword,
                         @Param("isActive") Boolean isActive,
                         Pageable pageable);

    /**
     * Kiểm tra tài khoản đã được liên kết với khách hàng khác chưa.
     * Trả về true cả khi khách hàng đã xoá mềm, để không tái sử dụng được
     * tài khoản đã gắn với một hồ sơ lịch sử.
     */
    @Query(value = "SELECT COUNT(*) FROM customers WHERE user_id = :userId", nativeQuery = true)
    long countByUserIdIncludingDeleted(@Param("userId") UUID userId);

    /**
     * Tìm các hồ sơ chưa gắn tài khoản khớp email hoặc phone để giữ lại lịch sử
     * nhập thủ công nhưng ngừng dùng làm hồ sơ hoạt động sau khi đăng ký.
     */
    @Query("""
            SELECT c FROM Customer c
            WHERE c.userId IS NULL
              AND ((:email IS NOT NULL AND LOWER(c.email) = LOWER(:email))
                   OR (:phone IS NOT NULL AND c.phone = :phone))
            """)
    List<Customer> findUnlinkedByEmailOrPhone(@Param("email") String email,
                                               @Param("phone") String phone);

    /**
     * Lấy khách hàng theo ID kể cả khi đã soft delete (native query để bypass
     * {@code @SQLRestriction}).
     */
    @Query(value = "SELECT * FROM customers WHERE id = :id", nativeQuery = true)
    Optional<Customer> findByIdRaw(@Param("id") UUID id);
}