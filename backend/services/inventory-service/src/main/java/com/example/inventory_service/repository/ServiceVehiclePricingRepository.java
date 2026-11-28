package com.example.inventory_service.repository;

import com.example.inventory_service.entity.ServiceVehiclePricing;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ServiceVehiclePricingRepository extends JpaRepository<ServiceVehiclePricing, UUID> {

    List<ServiceVehiclePricing> findByServiceIdOrderByBrandAscModelAsc(UUID serviceId);

    Optional<ServiceVehiclePricing> findByServiceIdAndBrandAndModel(UUID serviceId, String brand, String model);
}
