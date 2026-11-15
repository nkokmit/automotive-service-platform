package com.example.work_order_service.mapper;

import com.example.work_order_service.dto.response.WorkOrderListItemResponse;
import com.example.work_order_service.dto.response.WorkOrderResponse;
import com.example.work_order_service.dto.response.WorkOrderStatusHistoryResponse;
import com.example.work_order_service.dto.response.BookingSummaryResponse;
import com.example.work_order_service.dto.response.BookingServiceSummaryResponse;
import com.example.work_order_service.dto.response.CustomerSummaryResponse;
import com.example.work_order_service.dto.response.VehicleSummaryResponse;
import com.example.work_order_service.dto.response.EstimateSummaryResponse;
import com.example.work_order_service.entity.WorkOrder;
import com.example.work_order_service.entity.WorkOrderStatusHistory;
import com.example.work_order_service.integration.contract.BookingContract;
import com.example.work_order_service.integration.contract.CustomerContract;
import com.example.work_order_service.integration.contract.VehicleContract;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class WorkOrderMapper {

    public WorkOrderResponse toResponse(
            WorkOrder workOrder,
            List<WorkOrderStatusHistory> history,
            BookingContract booking,
            CustomerContract customer,
            VehicleContract vehicle,
            List<EstimateSummaryResponse> estimates
    ) {
        List<WorkOrderStatusHistoryResponse> historyResponses = history.stream()
                .map(this::toHistoryResponse)
                .toList();
        return new WorkOrderResponse(
                workOrder.getId(),
                workOrder.getCode(),
                workOrder.getBookingId(),
                workOrder.getCustomerId(),
                workOrder.getVehicleId(),
                new BookingSummaryResponse(
                        booking.id(),
                        booking.licensePlateSnapshot(),
                        booking.startAt(),
                        booking.endAt(),
                        booking.status(),
                        booking.source(),
                        booking.customerNote(),
                        booking.services().stream()
                                .map(service -> new BookingServiceSummaryResponse(
                                        service.serviceId(),
                                        service.serviceNameSnapshot(),
                                        service.estimatedDurationMinutes(),
                                        service.requiredTechniciansSnapshot(),
                                        service.sequenceNumber()))
                                .toList()),
                new CustomerSummaryResponse(customer.id(), customer.fullName(), customer.phone()),
                new VehicleSummaryResponse(
                        vehicle.id(),
                        vehicle.licensePlate(),
                        vehicle.vin(),
                        vehicle.make(),
                        vehicle.model(),
                        vehicle.modelYear(),
                        vehicle.trim(),
                        vehicle.color(),
                        vehicle.fuelType(),
                        vehicle.transmission(),
                        vehicle.odometerKm(),
                        vehicle.notes(),
                        vehicle.isActive()),
                workOrder.getAdvisorId(),
                workOrder.getStatus(),
                workOrder.getOdometerIn(),
                workOrder.getOdometerOut(),
                workOrder.getVehicleCondition(),
                workOrder.getCustomerNote(),
                workOrder.getCreatedAt(),
                workOrder.getUpdatedAt(),
                estimates,
                historyResponses);
    }

    public WorkOrderListItemResponse toListItem(WorkOrder workOrder) {
        return new WorkOrderListItemResponse(
                workOrder.getId(),
                workOrder.getCode(),
                workOrder.getBookingId(),
                workOrder.getCustomerId(),
                workOrder.getVehicleId(),
                workOrder.getAdvisorId(),
                workOrder.getStatus(),
                workOrder.getOdometerIn(),
                workOrder.getCreatedAt(),
                workOrder.getUpdatedAt());
    }

    private WorkOrderStatusHistoryResponse toHistoryResponse(WorkOrderStatusHistory history) {
        return new WorkOrderStatusHistoryResponse(
                history.getId(),
                history.getStatusFrom(),
                history.getStatusTo(),
                history.getChangedBy(),
                history.getNote(),
                history.getCreatedAt());
    }
}
