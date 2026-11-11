package com.example.work_order_service.service;

import com.example.work_order_service.dto.request.CreateWorkOrderRequest;
import com.example.work_order_service.dto.response.WorkOrderListItemResponse;
import com.example.work_order_service.dto.response.WorkOrderPageResponse;
import com.example.work_order_service.dto.response.WorkOrderResponse;
import com.example.work_order_service.entity.WorkOrder;
import com.example.work_order_service.enums.WorkOrderStatus;
import com.example.work_order_service.exception.ApiException;
import com.example.work_order_service.exception.ErrorCode;
import com.example.work_order_service.integration.WorkOrderIntegrationService;
import com.example.work_order_service.integration.WorkOrderDetailContext;
import com.example.work_order_service.integration.contract.BookingContract;
import com.example.work_order_service.mapper.WorkOrderMapper;
import com.example.work_order_service.mapper.EstimateMapper;
import com.example.work_order_service.repository.EstimateRepository;
import com.example.work_order_service.repository.WorkOrderRepository;
import com.example.work_order_service.repository.WorkOrderStatusHistoryRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class WorkOrderServiceImpl implements WorkOrderService {

    private static final int MAX_PAGE_SIZE = 100;

    private final WorkOrderRepository workOrderRepository;
    private final EstimateRepository estimateRepository;
    private final WorkOrderStatusHistoryRepository historyRepository;
    private final WorkOrderIntegrationService integrationService;
    private final WorkOrderCreationTransaction creationTransaction;
    private final WorkOrderDiagnosisTransaction diagnosisTransaction;
    private final WorkOrderCompletionTransaction completionTransaction;
    private final WorkOrderCancellationTransaction cancellationTransaction;
    private final WorkOrderMapper mapper;
    private final EstimateMapper estimateMapper;

    @Override
    public WorkOrderCreateResult create(CreateWorkOrderRequest request, Jwt jwt) {
        UUID advisorId = requireUserId(jwt);
        var existing = workOrderRepository.findByBookingId(request.bookingId());
        if (existing.isPresent()) {
            return new WorkOrderCreateResult(get(existing.get().getId()), false);
        }

        WorkOrderDetailContext detailContext = integrationService.requireCheckedInBooking(request.bookingId());
        BookingContract booking = detailContext.booking();
        if (!request.bookingId().equals(booking.id())) {
            throw new ApiException(ErrorCode.INTEGRATION_SERVICE_UNAVAILABLE,
                    "Booking Service trả về lịch hẹn không khớp yêu cầu");
        }

        try {
            WorkOrder created = creationTransaction.create(request, booking, advisorId);
            return new WorkOrderCreateResult(get(created.getId(), detailContext), true);
        } catch (DataIntegrityViolationException exception) {
            var concurrentCreate = workOrderRepository.findByBookingId(request.bookingId());
            if (concurrentCreate.isPresent()) {
                return new WorkOrderCreateResult(get(concurrentCreate.get().getId()), false);
            }
            throw exception;
        }
    }

    @Override
    public WorkOrderResponse startDiagnosis(UUID id, Jwt jwt) {
        diagnosisTransaction.start(id, requireUserId(jwt));
        return get(id);
    }

    @Override
    public WorkOrderResponse complete(UUID id, Jwt jwt) {
        completionTransaction.complete(id, requireUserId(jwt));
        return get(id);
    }

    @Override
    public WorkOrderResponse cancel(UUID id, Jwt jwt) {
        cancellationTransaction.cancel(id, requireUserId(jwt));
        return get(id);
    }

    @Override
    public WorkOrderResponse get(UUID id) {
        WorkOrder workOrder = workOrderRepository.findById(id)
                .orElseThrow(() -> new ApiException(ErrorCode.WORK_ORDER_NOT_FOUND));
        WorkOrderDetailContext detailContext = integrationService.getDetailContext(workOrder);
        return get(workOrder, detailContext);
    }

    private WorkOrderResponse get(UUID id, WorkOrderDetailContext detailContext) {
        WorkOrder workOrder = workOrderRepository.findById(id)
                .orElseThrow(() -> new ApiException(ErrorCode.WORK_ORDER_NOT_FOUND));
        return get(workOrder, detailContext);
    }

    private WorkOrderResponse get(WorkOrder workOrder, WorkOrderDetailContext detailContext) {
        return mapper.toResponse(
                workOrder,
                historyRepository.findByWorkOrder_IdOrderByCreatedAtAsc(workOrder.getId()),
                detailContext.booking(),
                detailContext.customer(),
                detailContext.vehicle(),
                estimateRepository.findByWorkOrder_IdOrderByCreatedAtAsc(workOrder.getId()).stream()
                        .map(estimateMapper::toSummary)
                        .toList());
    }

    @Override
    @Transactional(readOnly = true)
    public WorkOrderPageResponse search(
            WorkOrderStatus status,
            UUID customerId,
            UUID vehicleId,
            UUID bookingId,
            UUID assignedTechId,
            Instant fromInclusive,
            Instant toExclusive,
            int page,
            int size
    ) {
        if (page < 0 || size < 1) {
            throw new ApiException(ErrorCode.INVALID_REQUEST, "page phải >= 0 và size phải >= 1");
        }
        if (fromInclusive != null && toExclusive != null && fromInclusive.isAfter(toExclusive)) {
            throw new ApiException(ErrorCode.INVALID_REQUEST, "from phải nhỏ hơn hoặc bằng to");
        }
        Page<WorkOrder> result = workOrderRepository.search(
                status == null ? null : status.name(),
                stringify(customerId),
                stringify(vehicleId),
                stringify(bookingId),
                stringify(assignedTechId),
                fromInclusive,
                toExclusive,
                PageRequest.of(page, Math.min(size, MAX_PAGE_SIZE)));
        return new WorkOrderPageResponse(
                result.getContent().stream().map(mapper::toListItem).toList(),
                result.getNumber(),
                result.getSize(),
                result.getTotalElements(),
                result.getTotalPages());
    }

    private UUID requireUserId(Jwt jwt) {
        if (jwt == null) {
            throw new ApiException(ErrorCode.UNAUTHENTICATED);
        }
        try {
            return UUID.fromString(jwt.getClaimAsString("userId"));
        } catch (IllegalArgumentException | NullPointerException exception) {
            throw new ApiException(ErrorCode.UNAUTHENTICATED);
        }
    }

    private String stringify(UUID value) {
        return value == null ? null : value.toString();
    }
}
