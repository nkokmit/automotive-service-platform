package com.example.work_order_service.repository;

import com.example.work_order_service.entity.WorkOrderServiceLine;
import com.example.work_order_service.enums.WorkOrderServiceStatus;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface WorkOrderServiceLineRepository extends JpaRepository<WorkOrderServiceLine, UUID> {

    List<WorkOrderServiceLine> findByEstimate_IdOrderByCreatedAtAsc(UUID estimateId);

    Optional<WorkOrderServiceLine> findByIdAndEstimate_Id(UUID id, UUID estimateId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select serviceLine from WorkOrderServiceLine serviceLine where serviceLine.id = :id")
    Optional<WorkOrderServiceLine> findByIdForUpdate(@Param("id") UUID id);

    List<WorkOrderServiceLine> findByAssignedTechIdOrderByCreatedAtAsc(UUID assignedTechId);

    List<WorkOrderServiceLine> findByAssignedTechIdAndStatusOrderByCreatedAtAsc(
            UUID assignedTechId,
            WorkOrderServiceStatus status);
}
