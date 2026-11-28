package com.example.inventory_service.repository;

import com.example.inventory_service.entity.ServiceBom;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ServiceBomRepository extends JpaRepository<ServiceBom, UUID> {

    @EntityGraph(attributePaths = "part")
    List<ServiceBom> findByServiceIdOrderById(UUID serviceId);

    @EntityGraph(attributePaths = "part")
    List<ServiceBom> findByServiceIdAndBrandAndModelOrderById(UUID serviceId, String brand, String model);

    @EntityGraph(attributePaths = "part")
    @Query("""
            SELECT b FROM ServiceBom b
            WHERE b.service.id = :serviceId
              AND (:brand IS NULL OR b.brand = :brand)
              AND (:model IS NULL OR b.model = :model)
            ORDER BY b.id
            """)
    List<ServiceBom> searchByVehicle(@Param("serviceId") UUID serviceId,
                                     @Param("brand") String brand,
                                     @Param("model") String model);

    Optional<ServiceBom> findByServiceIdAndPartId(UUID serviceId, UUID partId);

    boolean existsByServiceIdAndPartIdAndBrandAndModel(UUID serviceId, UUID partId,
                                                       String brand, String model);

    boolean existsByServiceIdAndPartIdAndBrandAndModelAndIdNot(UUID serviceId, UUID partId,
                                                               String brand, String model, UUID id);

    void deleteByServiceId(UUID serviceId);

    /**
     * Đếm số dịch vụ dùng phụ tùng này - dùng để báo lỗi khi xóa phụ tùng
     * còn nằm trong định mức của dịch vụ nào đó.
     */
    @Query("SELECT COUNT(b) FROM ServiceBom b WHERE b.part.id = :partId")
    long countByPartId(@Param("partId") UUID partId);
}
