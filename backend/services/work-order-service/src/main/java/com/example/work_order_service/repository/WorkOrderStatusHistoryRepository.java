package com.example.work_order_service.repository;

import com.example.work_order_service.entity.WorkOrderStatusHistory;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface WorkOrderStatusHistoryRepository extends JpaRepository<WorkOrderStatusHistory, UUID> {

    List<WorkOrderStatusHistory> findByWorkOrder_IdOrderByCreatedAtAsc(UUID workOrderId);
}
