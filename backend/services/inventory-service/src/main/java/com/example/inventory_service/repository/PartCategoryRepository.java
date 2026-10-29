package com.example.inventory_service.repository;

import com.example.inventory_service.entity.PartCategory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface PartCategoryRepository extends JpaRepository<PartCategory, UUID> {

    boolean existsByCodeIgnoreCase(String code);

    boolean existsByCodeIgnoreCaseAndIdNot(String code, UUID id);

    @Query("""
            SELECT pc FROM PartCategory pc
            WHERE (:keyword IS NULL OR :keyword = ''
                   OR LOWER(pc.code) LIKE LOWER(CONCAT('%', :keyword, '%'))
                   OR LOWER(pc.name) LIKE LOWER(CONCAT('%', :keyword, '%')))
            """)
    Page<PartCategory> search(@Param("keyword") String keyword, Pageable pageable);

    /**
     * Đếm số phụ tùng thuộc nhóm - dùng để chặn xóa nhóm khi còn phụ tùng
     * (FK {@code fk_parts_category} là {@code ON DELETE RESTRICT}).
     */
    @Query("SELECT COUNT(p) FROM Part p WHERE p.category.id = :categoryId")
    long countPartsByCategoryId(@Param("categoryId") UUID categoryId);
}
