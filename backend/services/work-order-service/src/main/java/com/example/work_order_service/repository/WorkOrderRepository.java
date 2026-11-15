package com.example.work_order_service.repository;

import com.example.work_order_service.entity.WorkOrder;
import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

public interface WorkOrderRepository extends JpaRepository<WorkOrder, UUID> {

    Optional<WorkOrder> findByBookingId(UUID bookingId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select workOrder from WorkOrder workOrder where workOrder.id = :id")
    Optional<WorkOrder> findByIdForUpdate(@Param("id") UUID id);

    @Query(value = """
            SELECT DISTINCT wo.*
            FROM work_orders wo
            LEFT JOIN estimates e ON e.work_order_id = wo.id
            LEFT JOIN work_order_services wos ON wos.estimate_id = e.id
            WHERE (:status IS NULL OR wo.status = :status)
              AND (:customerId IS NULL OR wo.customer_id = :customerId)
              AND (:vehicleId IS NULL OR wo.vehicle_id = :vehicleId)
              AND (:bookingId IS NULL OR wo.booking_id = :bookingId)
              AND (:assignedTechId IS NULL OR wos.assigned_tech_id = :assignedTechId)
              AND (:fromInclusive IS NULL OR wo.created_at >= :fromInclusive)
              AND (:toExclusive IS NULL OR wo.created_at < :toExclusive)
            ORDER BY wo.created_at DESC, wo.id DESC
            """,
            countQuery = """
                    SELECT COUNT(DISTINCT wo.id)
                    FROM work_orders wo
                    LEFT JOIN estimates e ON e.work_order_id = wo.id
                    LEFT JOIN work_order_services wos ON wos.estimate_id = e.id
                    WHERE (:status IS NULL OR wo.status = :status)
                      AND (:customerId IS NULL OR wo.customer_id = :customerId)
                      AND (:vehicleId IS NULL OR wo.vehicle_id = :vehicleId)
                      AND (:bookingId IS NULL OR wo.booking_id = :bookingId)
                      AND (:assignedTechId IS NULL OR wos.assigned_tech_id = :assignedTechId)
                      AND (:fromInclusive IS NULL OR wo.created_at >= :fromInclusive)
                      AND (:toExclusive IS NULL OR wo.created_at < :toExclusive)
                    """,
            nativeQuery = true)
    Page<WorkOrder> search(
            @Param("status") String status,
            @Param("customerId") String customerId,
            @Param("vehicleId") String vehicleId,
            @Param("bookingId") String bookingId,
            @Param("assignedTechId") String assignedTechId,
            @Param("fromInclusive") Instant fromInclusive,
            @Param("toExclusive") Instant toExclusive,
            Pageable pageable
    );
}
