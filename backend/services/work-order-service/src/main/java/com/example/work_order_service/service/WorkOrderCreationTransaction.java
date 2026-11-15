package com.example.work_order_service.service;

import com.example.work_order_service.dto.request.CreateWorkOrderRequest;
import com.example.work_order_service.entity.WorkOrder;
import com.example.work_order_service.entity.WorkOrderStatusHistory;
import com.example.work_order_service.enums.WorkOrderStatus;
import com.example.work_order_service.integration.contract.BookingContract;
import com.example.work_order_service.repository.WorkOrderRepository;
import com.example.work_order_service.repository.WorkOrderStatusHistoryRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class WorkOrderCreationTransaction {

    private final WorkOrderRepository workOrderRepository;
    private final WorkOrderStatusHistoryRepository historyRepository;

    @Transactional
    public WorkOrder create(
            CreateWorkOrderRequest request,
            BookingContract booking,
            UUID advisorId
    ) {
        return create(
                booking.id(),
                booking.customerId(),
                booking.vehicleId(),
                advisorId,
                request.odometerIn(),
                request.vehicleCondition(),
                request.customerNote());
    }

    @Transactional
    public WorkOrder createFromCheckInEvent(
            UUID bookingId,
            UUID customerId,
            UUID vehicleId,
            UUID advisorId,
            Integer odometerIn,
            String vehicleCondition,
            String customerNote
    ) {
        return create(bookingId, customerId, vehicleId, advisorId, odometerIn, vehicleCondition, customerNote);
    }

    private WorkOrder create(
            UUID bookingId,
            UUID customerId,
            UUID vehicleId,
            UUID advisorId,
            Integer odometerIn,
            String vehicleCondition,
            String customerNote
    ) {
        WorkOrder workOrder = WorkOrder.builder()
                .code("WO-" + UUID.randomUUID())
                .bookingId(bookingId)
                .customerId(customerId)
                .vehicleId(vehicleId)
                .advisorId(advisorId)
                .status(WorkOrderStatus.CREATED)
                .odometerIn(odometerIn)
                .vehicleCondition(vehicleCondition)
                .customerNote(customerNote)
                .build();
        workOrderRepository.saveAndFlush(workOrder);
        historyRepository.save(WorkOrderStatusHistory.builder()
                .workOrder(workOrder)
                .statusFrom(null)
                .statusTo(WorkOrderStatus.CREATED.name())
                .changedBy(advisorId)
                .note("Vehicle checked in")
                .build());
        return workOrder;
    }
}
