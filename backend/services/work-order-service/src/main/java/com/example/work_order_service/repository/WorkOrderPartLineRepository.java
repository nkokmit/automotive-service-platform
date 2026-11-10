package com.example.work_order_service.repository;

import com.example.work_order_service.entity.WorkOrderPartLine;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface WorkOrderPartLineRepository extends JpaRepository<WorkOrderPartLine, UUID> {

    List<WorkOrderPartLine> findByEstimate_IdOrderByCreatedAtAsc(UUID estimateId);

    Optional<WorkOrderPartLine> findByIdAndEstimate_Id(UUID id, UUID estimateId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("""
            select line from WorkOrderPartLine line
            join fetch line.estimate estimate
            where line.id = :lineId and estimate.workOrder.id = :workOrderId
            """)
    Optional<WorkOrderPartLine> findByIdAndEstimate_WorkOrder_IdForUpdate(
            @Param("lineId") UUID lineId,
            @Param("workOrderId") UUID workOrderId);

    List<WorkOrderPartLine> findByEstimate_WorkOrder_IdOrderByCreatedAtAsc(UUID workOrderId);

    void deleteBySourceServiceLineId(UUID serviceLineId);
}
