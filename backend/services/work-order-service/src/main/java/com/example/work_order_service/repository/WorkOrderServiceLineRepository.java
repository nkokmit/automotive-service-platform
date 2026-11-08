package com.example.work_order_service.repository;

import com.example.work_order_service.entity.WorkOrderServiceLine;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface WorkOrderServiceLineRepository extends JpaRepository<WorkOrderServiceLine, UUID> {

    List<WorkOrderServiceLine> findByEstimate_IdOrderByCreatedAtAsc(UUID estimateId);

    Optional<WorkOrderServiceLine> findByIdAndEstimate_Id(UUID id, UUID estimateId);
}
