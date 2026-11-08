package com.example.work_order_service.dto.response;

import com.example.work_order_service.enums.WorkOrderStatus;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record WorkOrderResponse(
        UUID id,
        String code,
        UUID bookingId,
        UUID customerId,
        UUID vehicleId,
        BookingSummaryResponse booking,
        CustomerSummaryResponse customer,
        VehicleSummaryResponse vehicle,
        UUID advisorId,
        WorkOrderStatus status,
        Integer odometerIn,
        Integer odometerOut,
        String vehicleCondition,
        String customerNote,
        Instant createdAt,
        Instant updatedAt,
        List<EstimateSummaryResponse> estimates,
        List<WorkOrderStatusHistoryResponse> statusHistory
) {
    public WorkOrderResponse {
        estimates = List.copyOf(estimates);
        statusHistory = List.copyOf(statusHistory);
    }
}
