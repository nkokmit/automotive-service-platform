package com.example.work_order_service.repository;

import com.example.work_order_service.entity.Estimate;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface EstimateRepository extends JpaRepository<Estimate, UUID> {

    List<Estimate> findByWorkOrder_IdOrderByCreatedAtAsc(UUID workOrderId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select estimate from Estimate estimate where estimate.id = :id")
    Optional<Estimate> findByIdForUpdate(@Param("id") UUID id);
}
