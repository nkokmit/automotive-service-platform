package com.example.inventory_service.repository;

import com.example.inventory_service.entity.Part;
import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface PartRepository extends JpaRepository<Part, UUID> {

    boolean existsBySkuIgnoreCase(String sku);

    boolean existsBySkuIgnoreCaseAndIdNot(String sku, UUID id);

    Optional<Part> findBySkuIgnoreCase(String sku);

    /**
     * Tìm phụ tùng kèm khóa ghi (SELECT ... FOR UPDATE).
     *
     * <p>Dùng cho mọi thao tác biến động tồn kho (giữ chỗ / xuất kho / giải
     * phóng / nhập kho). Không có khóa này, hai request đồng thời cùng đọc
     * {@code on_hand_stock} rồi cùng ghi lại có thể làm tồn kho âm — vi phạm
     * tiêu chí chấp nhận §2 của PLAN.md.
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT p FROM Part p WHERE p.id = :id")
    Optional<Part> findByIdForUpdate(@Param("id") UUID id);

    /**
     * Tìm kiếm phụ tùng nâng cao (PLAN.md Module 3.1).
     *
     * <p>Bộ lọc:
     * <ul>
     *   <li>{@code keyword} - tìm trong SKU, mã OEM, tên và hãng</li>
     *   <li>{@code sku} - khớp chính xác SKU (không phân biệt hoa thường)</li>
     *   <li>{@code oemCode} - khớp chính xác mã OEM</li>
     *   <li>{@code brand} - khớp chính xác hãng phụ tùng</li>
     *   <li>{@code categoryId} - nhóm phụ tùng</li>
     *   <li>{@code vehicleBrand}/{@code vehicleModel} - lọc theo dòng xe tương
     *       thích qua {@code part_vehicle_compatibilities}</li>
     *   <li>{@code isActive} - trạng thái hoạt động</li>
     *   <li>{@code lowStockOnly} - chỉ lấy phụ tùng sắp hết tồn
     *       ({@code on_hand_stock <= min_stock_level})</li>
     * </ul>
     *
     * <p>Bộ lọc dòng xe dùng {@code EXISTS} thay vì {@code JOIN} để một phụ
     * tùng tương thích nhiều dòng xe vẫn chỉ xuất hiện 1 lần trong kết quả
     * phân trang (JOIN sẽ nhân bản dòng và làm sai {@code totalElements}).
     */
    @Query("""
            SELECT p FROM Part p
            WHERE (:keyword IS NULL OR :keyword = ''
                   OR LOWER(p.sku) LIKE LOWER(CONCAT('%', :keyword, '%'))
                   OR LOWER(p.oemCode) LIKE LOWER(CONCAT('%', :keyword, '%'))
                   OR LOWER(p.name) LIKE LOWER(CONCAT('%', :keyword, '%'))
                   OR LOWER(p.brand) LIKE LOWER(CONCAT('%', :keyword, '%')))
              AND (:sku IS NULL OR LOWER(p.sku) = LOWER(:sku))
              AND (:oemCode IS NULL OR LOWER(p.oemCode) = LOWER(:oemCode))
              AND (:brand IS NULL OR LOWER(p.brand) = LOWER(:brand))
              AND (:categoryId IS NULL OR p.category.id = :categoryId)
              AND (:isActive IS NULL OR p.isActive = :isActive)
              AND (:lowStockOnly = false OR p.onHandStock <= p.minStockLevel)
              AND (:vehicleBrand IS NULL OR EXISTS (
                    SELECT c FROM PartVehicleCompatibility c
                    WHERE c.part.id = p.id
                      AND LOWER(c.vehicleBrand) = LOWER(:vehicleBrand)
              ))
              AND (:vehicleModel IS NULL OR EXISTS (
                    SELECT c FROM PartVehicleCompatibility c
                    WHERE c.part.id = p.id
                      AND (:vehicleBrand IS NULL OR LOWER(c.vehicleBrand) = LOWER(:vehicleBrand))
                      AND LOWER(c.vehicleModel) = LOWER(:vehicleModel)
              ))
            """)
    Page<Part> search(@Param("keyword") String keyword,
                       @Param("sku") String sku,
                       @Param("oemCode") String oemCode,
                       @Param("brand") String brand,
                       @Param("categoryId") UUID categoryId,
                       @Param("isActive") Boolean isActive,
                       @Param("lowStockOnly") boolean lowStockOnly,
                       @Param("vehicleBrand") String vehicleBrand,
                       @Param("vehicleModel") String vehicleModel,
                       Pageable pageable);
}
