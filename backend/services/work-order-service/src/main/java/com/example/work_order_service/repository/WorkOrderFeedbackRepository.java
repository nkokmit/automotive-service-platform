package com.example.work_order_service.repository;

import com.example.work_order_service.entity.WorkOrderFeedback;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.Optional;
import java.util.UUID;

public interface WorkOrderFeedbackRepository extends JpaRepository<WorkOrderFeedback, UUID> {

    Optional<WorkOrderFeedback> findByWorkOrder_Id(UUID workOrderId);

    boolean existsByWorkOrder_Id(UUID workOrderId);

    Page<WorkOrderFeedback> findAllByOrderByCreatedAtDescIdDesc(Pageable pageable);

    @Query("""
            select sum(feedback.rating) as ratingSum, count(feedback) as reviewCount
            from WorkOrderFeedback feedback
            """)
    FeedbackAggregateProjection summarize();
}
