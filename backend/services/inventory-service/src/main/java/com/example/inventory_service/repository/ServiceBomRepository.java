package com.example.inventory_service.repository;

import com.example.inventory_service.entity.ServiceBom;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ServiceBomRepository extends JpaRepository<ServiceBom, UUID> {

    List<ServiceBom> findByServiceIdOrderById(UUID serviceId);

    Optional<ServiceBom> findByServiceIdAndPartId(UUID serviceId, UUID partId);

    boolean existsByServiceIdAndPartId(UUID serviceId, UUID partId);

    void deleteByServiceId(UUID serviceId);

    /**
     * Đếm số dịch vụ dùng phụ tùng này - dùng để báo lỗi khi xóa phụ tùng
     * còn nằm trong định mức của dịch vụ nào đó.
     */
    @Query("SELECT COUNT(b) FROM ServiceBom b WHERE b.part.id = :partId")
    long countByPartId(@Param("partId") UUID partId);
}
