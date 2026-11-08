package com.example.work_order_service.service;

import com.example.work_order_service.dto.request.CreateWorkOrderRequest;
import com.example.work_order_service.dto.response.WorkOrderPageResponse;
import com.example.work_order_service.dto.response.WorkOrderResponse;
import com.example.work_order_service.enums.WorkOrderStatus;
import org.springframework.security.oauth2.jwt.Jwt;

import java.time.Instant;
import java.util.UUID;

public interface WorkOrderService {

    WorkOrderCreateResult create(CreateWorkOrderRequest request, Jwt jwt);

    WorkOrderResponse startDiagnosis(UUID id, Jwt jwt);

    WorkOrderResponse get(UUID id);

    WorkOrderPageResponse search(
            WorkOrderStatus status,
            UUID customerId,
            UUID vehicleId,
            UUID bookingId,
            UUID assignedTechId,
            Instant fromInclusive,
            Instant toExclusive,
            int page,
            int size
    );
}
