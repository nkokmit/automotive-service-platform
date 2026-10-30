package com.example.inventory_service.repository;

import com.example.inventory_service.entity.PartVehicleCompatibility;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface PartVehicleCompatibilityRepository
        extends JpaRepository<PartVehicleCompatibility, UUID> {

    List<PartVehicleCompatibility> findByPartIdOrderById(UUID partId);

    @Query("""
            SELECT c FROM PartVehicleCompatibility c
            WHERE c.part.id = :partId
              AND LOWER(c.vehicleBrand) = LOWER(:vehicleBrand)
              AND LOWER(c.vehicleModel) = LOWER(:vehicleModel)
            """)
    List<PartVehicleCompatibility> findByPartIdAndVehicle(@Param("partId") UUID partId,
                                                           @Param("vehicleBrand") String vehicleBrand,
                                                           @Param("vehicleModel") String vehicleModel);

    void deleteByPartId(UUID partId);
}
