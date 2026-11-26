package com.example.customer_vehicle_service.repository;

import com.example.customer_vehicle_service.entity.VehicleServiceHistory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface VehicleServiceHistoryRepository
        extends JpaRepository<VehicleServiceHistory, UUID> {

    Page<VehicleServiceHistory> findByVehicleId(UUID vehicleId, Pageable pageable);
    Page<VehicleServiceHistory> findByCustomerIdOrderByServiceDateDesc(UUID customerId,
                                                                      Pageable pageable);
    boolean existsByWorkOrderId(UUID workOrderId);

    Page<VehicleServiceHistory> findAllByOrderByServiceDateDesc(Pageable pageable);
}