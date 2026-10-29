package com.example.inventory_service.repository;

import com.example.inventory_service.entity.ServiceCategory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

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
     * Đếm số dịch vụ thuộc nhóm - dùng để chặn xóa nhóm khi còn dịch vụ
     * (FK {@code fk_services_category} là {@code ON DELETE RESTRICT}).
     */
    @Query("SELECT COUNT(s) FROM Service s WHERE s.category.id = :categoryId")
    long countServicesByCategoryId(@Param("categoryId") UUID categoryId);
}
