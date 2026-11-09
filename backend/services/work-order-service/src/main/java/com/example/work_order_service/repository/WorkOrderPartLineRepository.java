package com.example.work_order_service.repository;

import com.example.work_order_service.entity.WorkOrderPartLine;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface WorkOrderPartLineRepository extends JpaRepository<WorkOrderPartLine, UUID> {

    List<WorkOrderPartLine> findByEstimate_IdOrderByCreatedAtAsc(UUID estimateId);

    Optional<WorkOrderPartLine> findByIdAndEstimate_Id(UUID id, UUID estimateId);

    void deleteBySourceServiceLineId(UUID serviceLineId);
}
