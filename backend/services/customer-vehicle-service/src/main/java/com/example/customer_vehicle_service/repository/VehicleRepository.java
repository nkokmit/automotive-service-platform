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
     * Kiểm tra VIN đã tồn tại chưa, <b>kể cả xe đã xoá mềm</b> (native query để
     * bypass {@code @SQLRestriction}).
     *
     * <p>{@code uk_vehicles_vin} là UNIQUE cứng trong DB nên một VIN đã nằm trong
     * bảng — kể cả dòng đã xoá mềm — thì không thể gán cho xe khác. Nếu chỉ dùng
     * {@link #existsByVin(String)} thì một VIN tái sử dụng sẽ lọt qua check của
     * service rồi mới va {@code DataIntegrityViolationException} khi insert, tức
     * là client nhận 500 thay vì lỗi nghiệp vụ 2104.
     *
     * <p>Hệ quả: VIN của xe đã xoá mềm không thể tái sử dụng. Đây là hạn chế của
     * ràng buộc UNIQUE vĩnh viễn, chấp nhận được vì VIN vốn là định danh duy
     * nhất của một phương tiện — khác với biển số vốn được phép tái sử dụng.
     */
    @Query(value = """
    SELECT COUNT(*)
    FROM vehicles
    WHERE vin = :vin
    """, nativeQuery = true)
    long countByVinIncludingDeleted(@Param("vin") String vin);
    /**
     * Tìm kiếm + phân trang xe (PLAN.md bước 4).
     *
     * <p>Soft-deleted vehicle tự động bị loại nhờ {@code @SQLRestriction}.
     *
     * <p>Mỗi tham số {@code null} nghĩa là bỏ qua điều kiện lọc tương ứng:
     * <ul>
     *   <li>{@code customerId} — lọc theo chủ sở hữu hiện tại</li>
     *   <li>{@code licensePlate} — so khớp chính xác biển số (đã chuẩn hoá
     *       uppercase ở service), vì biển số là mã định danh ngắn chứ không phải
     *       từ khoá tìm kiếm</li>
     *   <li>{@code keyword} — tìm chuỗi con trong biển số / VIN / hãng / dòng xe,
     *       không phân biệt hoa thường</li>
     *   <li>{@code isActive} — lọc theo trạng thái hoạt động</li>
     * </ul>
     *
     * <p>VIN nullable được kiểm tra trong nhánh tìm kiếm riêng; các nhánh OR
     * còn lại vẫn cho phép tìm xe không có VIN theo biển số, hãng hoặc dòng xe.
     */
    @Query("""
            SELECT v FROM Vehicle v
            WHERE (:customerId IS NULL OR v.customer.id = :customerId)
              AND (:licensePlate IS NULL OR v.licensePlate = :licensePlate)
              AND (:keyword IS NULL OR :keyword = ''
                   OR LOWER(v.licensePlate) LIKE LOWER(CONCAT('%', :keyword, '%'))
                   OR (v.vin IS NOT NULL
                       AND LOWER(v.vin) LIKE LOWER(CONCAT('%', :keyword, '%')))
                   OR LOWER(v.make) LIKE LOWER(CONCAT('%', :keyword, '%'))
                   OR LOWER(v.model) LIKE LOWER(CONCAT('%', :keyword, '%')))
              AND (:isActive IS NULL OR v.isActive = :isActive)
            """)
    Page<Vehicle> search(@Param("customerId") UUID customerId,
                         @Param("licensePlate") String licensePlate,
                         @Param("keyword") String keyword,
                         @Param("isActive") Boolean isActive,
                         Pageable pageable);

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