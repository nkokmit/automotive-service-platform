package com.example.inventory_service.repository;

import com.example.inventory_service.entity.Service;
import com.example.inventory_service.entity.ServiceCategory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface ServiceCategoryRepository extends JpaRepository<ServiceCategory, UUID> {

    boolean existsByCodeIgnoreCase(String code);

    boolean existsByCodeIgnoreCaseAndIdNot(String code, UUID id);

    long countByNameIgnoreCase(String name);

    @Query("""
            SELECT sc FROM ServiceCategory sc
            WHERE (:keyword IS NULL OR :keyword = ''
                   OR LOWER(sc.code) LIKE LOWER(CONCAT('%', :keyword, '%'))
                   OR LOWER(sc.name) LIKE LOWER(CONCAT('%', :keyword, '%')))
            """)
    Page<ServiceCategory> search(@Param("keyword") String keyword, Pageable pageable);

    /**
     * Đếm số dịch vụ thuộc nhóm - dùng để chặn xóa nhóm khi còn dịch vụ.
     *
     * <p>Đếm TẤT CẢ dịch vụ, kể cả dịch vụ đã ẩn ({@code is_active = false}).
     * Lý do: dịch vụ bị "xoá" đi thực tế là soft-delete — dòng vẫn còn trong
     * bảng {@code services}, và FK {@code fk_services_category} là
     * {@code ON DELETE RESTRICT} nên MySQL vẫn chặn xoá nhóm. Đếm cả dịch vụ
     * đã ẩn giúp backend chặn sớm với thông báo rõ ràng, thay vì để lỗi
     * FK lọt xuống tầng DB và trả về lỗi 500 "Unhandled exception".
     */
    @Query("SELECT COUNT(s) FROM Service s WHERE s.category.id = :categoryId")
    long countServicesByCategoryId(@Param("categoryId") UUID categoryId);

    /**
     * Đếm số dịch vụ ĐANG HOẠT ĐỘNG thuộc nhóm — chỉ dùng để soạn thông báo
     * lỗi thân thiện cho admin (dịch vụ đang hiển thị vs dịch vụ đã ẩn).
     */
    @Query("SELECT COUNT(s) FROM Service s WHERE s.category.id = :categoryId AND s.isActive = true")
    long countActiveServicesByCategoryId(@Param("categoryId") UUID categoryId);

    /**
     * Liệt kê các dịch vụ thuộc nhóm — dùng cho admin xem nhanh nhóm đang có
     * những dịch vụ nào trước khi xoá nhóm.
     */
    @Query("""
            SELECT s FROM Service s
            WHERE s.category.id = :categoryId
            ORDER BY s.isActive DESC, s.name ASC
            """)
    List<Service> findServicesByCategoryId(@Param("categoryId") UUID categoryId);
}
