package com.example.inventory_service.repository;

import com.example.inventory_service.entity.Service;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface ServiceRepository extends JpaRepository<Service, UUID> {

    boolean existsByCodeIgnoreCase(String code);

    boolean existsByCodeIgnoreCaseAndIdNot(String code, UUID id);

    Optional<Service> findByCodeIgnoreCase(String code);

    @Query("""
            SELECT s FROM Service s
            WHERE (:keyword IS NULL OR :keyword = ''
                   OR LOWER(s.code) LIKE LOWER(CONCAT('%', :keyword, '%'))
                   OR LOWER(s.name) LIKE LOWER(CONCAT('%', :keyword, '%')))
              AND (:categoryId IS NULL OR s.category.id = :categoryId)
              AND (:isActive IS NULL OR s.isActive = :isActive)
            """)
    Page<Service> search(@Param("keyword") String keyword,
                         @Param("categoryId") UUID categoryId,
                         @Param("isActive") Boolean isActive,
                         Pageable pageable);
}
