package com.example.customer_vehicle_service.repository;

import com.example.customer_vehicle_service.entity.Vehicle;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface VehicleRepository extends JpaRepository<Vehicle, UUID> {

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
     * <p>Cố ý KHÔNG có tham số lọc theo khách hàng: xe không còn quan hệ sở hữu
     * với customer nào ({@code V3__decouple_customer_from_vehicle.sql}). Muốn
     * biết khách nào từng mang xe này đến thì tra lịch sử bảo dưỡng theo
     * {@code customerId}, không lọc được ở mức hồ sơ xe.
     *
     * <p>Mỗi tham số {@code null} nghĩa là bỏ qua điều kiện lọc tương ứng:
     * <ul>
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
            WHERE (:licensePlate IS NULL OR v.licensePlate = :licensePlate)
              AND (:keyword IS NULL OR :keyword = ''
                   OR LOWER(v.licensePlate) LIKE LOWER(CONCAT('%', :keyword, '%'))
                   OR (v.vin IS NOT NULL
                       AND LOWER(v.vin) LIKE LOWER(CONCAT('%', :keyword, '%')))
                   OR LOWER(v.make) LIKE LOWER(CONCAT('%', :keyword, '%'))
                   OR LOWER(v.model) LIKE LOWER(CONCAT('%', :keyword, '%')))
              AND (:isActive IS NULL OR v.isActive = :isActive)
            """)
    Page<Vehicle> search(@Param("licensePlate") String licensePlate,
                         @Param("keyword") String keyword,
                         @Param("isActive") Boolean isActive,
                         Pageable pageable);

    /**
     * Lấy xe theo ID kể cả khi đã soft delete (native query để bypass
     * {@code @SQLRestriction}).
     *
     * <p>Tham số nhận dạng {@link String} (hex 36 ký tự) vì Hibernate bind
     * {@link UUID} trong native query thành binary 16 byte, không khớp cột
     * {@code varchar(36)}.
     */
    @Query(value = "SELECT * FROM vehicles WHERE id = :id", nativeQuery = true)
    Optional<Vehicle> findByIdRaw(@Param("id") String id);

    /**
     * Lấy nhiều xe theo id trong MỘT truy vấn.
     *
     * <p>Dùng khi cần tra cứu xe cho cả trang kết quả lịch sử bảo dưỡng — tránh
     * N+1 query (mỗi dòng một lần {@code findById}).
     *
     * <p>Soft-deleted vehicle tự động bị loại nhờ {@code @SQLRestriction}, nên xe
     * đã xoá sẽ không có trong kết quả → trường hiển thị tương ứng null.
     */
    List<Vehicle> findAllByIdIn(Collection<UUID> ids);
}