package com.example.work_order_service.service;

import com.example.work_order_service.dto.request.CreateWorkOrderRequest;
import com.example.work_order_service.entity.WorkOrder;
import com.example.work_order_service.enums.WorkOrderStatus;
import com.example.work_order_service.exception.ApiException;
import com.example.work_order_service.exception.ErrorCode;
import com.example.work_order_service.integration.WorkOrderDetailContext;
import com.example.work_order_service.integration.WorkOrderIntegrationService;
import com.example.work_order_service.integration.contract.BookingContract;
import com.example.work_order_service.integration.contract.CustomerContract;
import com.example.work_order_service.integration.contract.VehicleContract;
import com.example.work_order_service.mapper.WorkOrderMapper;
import com.example.work_order_service.mapper.EstimateMapper;
import com.example.work_order_service.repository.EstimateRepository;
import com.example.work_order_service.repository.WorkOrderRepository;
import com.example.work_order_service.repository.WorkOrderStatusHistoryRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.oauth2.jwt.Jwt;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class WorkOrderServiceImplTest {

    private final UUID bookingId = UUID.randomUUID();
    private final UUID workOrderId = UUID.randomUUID();

    @Mock
    private WorkOrderRepository workOrderRepository;
    @Mock
    private EstimateRepository estimateRepository;
    @Mock
    private WorkOrderStatusHistoryRepository historyRepository;
    @Mock
    private WorkOrderIntegrationService integrationService;
    @Mock
    private WorkOrderCreationTransaction creationTransaction;
    @Mock
    private WorkOrderDiagnosisTransaction diagnosisTransaction;
    @Mock
    private WorkOrderCompletionTransaction completionTransaction;
    @Mock
    private WorkOrderCancellationTransaction cancellationTransaction;

    private WorkOrderServiceImpl service;

    @BeforeEach
    void setUp() {
        service = new WorkOrderServiceImpl(
                workOrderRepository,
                estimateRepository,
                historyRepository,
                integrationService,
                creationTransaction,
                diagnosisTransaction,
                completionTransaction,
                cancellationTransaction,
                new WorkOrderMapper(),
                new EstimateMapper());
    }

    @Test
    void repeatedRequestReturnsExistingWorkOrderWithoutCallingIntegrations() {
        WorkOrder workOrder = WorkOrder.builder()
                .id(workOrderId)
                .code("WO-" + workOrderId)
                .bookingId(bookingId)
                .customerId(UUID.randomUUID())
                .vehicleId(UUID.randomUUID())
                .advisorId(UUID.randomUUID())
                .status(WorkOrderStatus.CREATED)
                .odometerIn(42)
                .createdAt(Instant.now())
                .updatedAt(Instant.now())
                .build();
        when(workOrderRepository.findByBookingId(bookingId)).thenReturn(Optional.of(workOrder));
        when(workOrderRepository.findById(workOrderId)).thenReturn(Optional.of(workOrder));
        when(historyRepository.findByWorkOrder_IdOrderByCreatedAtAsc(workOrderId)).thenReturn(java.util.List.of());
        when(integrationService.getDetailContext(workOrder)).thenReturn(new WorkOrderDetailContext(
                new BookingContract(
                        bookingId, workOrder.getCustomerId(), workOrder.getVehicleId(), workOrderId,
                        "51A-12345", null, null, "FULFILLED", "WALK_IN", null, null, List.of()),
                new CustomerContract(workOrder.getCustomerId(), "Customer", "0123", null, true),
                new VehicleContract(
                        workOrder.getVehicleId(), "51A-12345", null, "Make", "Model", (short) 2024,
                        null, null, null, null, 0, null, true)));

        WorkOrderCreateResult result = service.create(
                new CreateWorkOrderRequest(bookingId, 42, null, null),
                jwt());

        assertFalse(result.created());
        assertEquals(workOrderId, result.workOrder().id());
        assertEquals("Customer", result.workOrder().customer().fullName());
        verify(integrationService, never()).requireCheckedInBooking(bookingId);
        verify(creationTransaction, never()).create(org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.any());
    }

    @Test
    void startDiagnosisUsesAuthenticatedUserAndReturnsUpdatedWorkOrder() {
        UUID actorId = UUID.randomUUID();
        WorkOrder workOrder = WorkOrder.builder()
                .id(workOrderId)
                .code("WO-" + workOrderId)
                .bookingId(bookingId)
                .customerId(UUID.randomUUID())
                .vehicleId(UUID.randomUUID())
                .advisorId(UUID.randomUUID())
                .status(WorkOrderStatus.DIAGNOSING)
                .odometerIn(42)
                .createdAt(Instant.now())
                .updatedAt(Instant.now())
                .build();
        when(workOrderRepository.findById(workOrderId)).thenReturn(Optional.of(workOrder));
        when(historyRepository.findByWorkOrder_IdOrderByCreatedAtAsc(workOrderId)).thenReturn(List.of());
        when(integrationService.getDetailContext(workOrder)).thenReturn(new WorkOrderDetailContext(
                new BookingContract(
                        bookingId, workOrder.getCustomerId(), workOrder.getVehicleId(), workOrderId,
                        "51A-12345", null, null, "CHECKED_IN", "WALK_IN", null, null, List.of()),
                new CustomerContract(workOrder.getCustomerId(), "Customer", "0123", null, true),
                new VehicleContract(
                        workOrder.getVehicleId(), "51A-12345", null, "Make", "Model", (short) 2024,
                        null, null, null, null, 0, null, true)));

        var result = service.startDiagnosis(workOrderId, jwt(actorId));

        assertEquals(WorkOrderStatus.DIAGNOSING, result.status());
        verify(diagnosisTransaction).start(workOrderId, actorId);
    }

    @Test
    void startDiagnosisRejectsTokenWithoutValidUserId() {
        Jwt invalidJwt = Jwt.withTokenValue("test-token")
                .header("alg", "HS256")
                .subject(UUID.randomUUID().toString())
                .issuedAt(Instant.now())
                .expiresAt(Instant.now().plusSeconds(60))
                .build();

        ApiException exception = assertThrows(ApiException.class,
                () -> service.startDiagnosis(workOrderId, invalidJwt));

        assertEquals(ErrorCode.UNAUTHENTICATED, exception.getErrorCode());
        verify(diagnosisTransaction, never()).start(org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.any());
    }

    @Test
    void completeUsesAuthenticatedUserAndReturnsUpdatedWorkOrder() {
        UUID actorId = UUID.randomUUID();
        WorkOrder workOrder = WorkOrder.builder()
                .id(workOrderId)
                .code("WO-" + workOrderId)
                .bookingId(bookingId)
                .customerId(UUID.randomUUID())
                .vehicleId(UUID.randomUUID())
                .advisorId(UUID.randomUUID())
                .status(WorkOrderStatus.PENDING_PAYMENT)
                .odometerIn(42)
                .createdAt(Instant.now())
                .updatedAt(Instant.now())
                .build();
        when(workOrderRepository.findById(workOrderId)).thenReturn(Optional.of(workOrder));
        when(historyRepository.findByWorkOrder_IdOrderByCreatedAtAsc(workOrderId)).thenReturn(List.of());
        when(integrationService.getDetailContext(workOrder)).thenReturn(new WorkOrderDetailContext(
                new BookingContract(
                        bookingId, workOrder.getCustomerId(), workOrder.getVehicleId(), workOrderId,
                        "51A-12345", null, null, "CHECKED_IN", "WALK_IN", null, null, List.of()),
                new CustomerContract(workOrder.getCustomerId(), "Customer", "0123", null, true),
                new VehicleContract(
                        workOrder.getVehicleId(), "51A-12345", null, "Make", "Model", (short) 2024,
                        null, null, null, null, 0, null, true)));

        var result = service.complete(workOrderId, jwt(actorId));

        assertEquals(WorkOrderStatus.PENDING_PAYMENT, result.status());
        verify(completionTransaction).complete(workOrderId, actorId);
    }

    private Jwt jwt() {
        return jwt(UUID.randomUUID());
    }

    private Jwt jwt(UUID userId) {
        Instant now = Instant.now();
        return Jwt.withTokenValue("test-token")
                .header("alg", "HS256")
                .subject(UUID.randomUUID().toString())
                .claim("userId", userId.toString())
                .issuedAt(now)
                .expiresAt(now.plusSeconds(60))
                .build();
    }
}
