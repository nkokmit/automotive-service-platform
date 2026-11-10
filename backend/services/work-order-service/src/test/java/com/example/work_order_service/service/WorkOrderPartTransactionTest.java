package com.example.work_order_service.service;

import com.example.work_order_service.entity.Estimate;
import com.example.work_order_service.entity.WorkOrder;
import com.example.work_order_service.entity.WorkOrderPartLine;
import com.example.work_order_service.enums.EstimateStatus;
import com.example.work_order_service.enums.WorkOrderPartStatus;
import com.example.work_order_service.enums.WorkOrderStatus;
import com.example.work_order_service.integration.client.InventoryServiceClient;
import com.example.work_order_service.integration.contract.InternalInventoryTransactionContract;
import com.example.work_order_service.integration.contract.InternalPartStockCommand;
import com.example.work_order_service.integration.contract.ServiceApiResponse;
import com.example.work_order_service.repository.WorkOrderPartLineRepository;
import com.example.work_order_service.repository.WorkOrderRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.oauth2.jwt.Jwt;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class WorkOrderPartTransactionTest {

    private final UUID workOrderId = UUID.randomUUID();
    private final UUID partLineId = UUID.randomUUID();
    private final UUID partId = UUID.randomUUID();
    private final UUID actorId = UUID.randomUUID();

    @Mock
    private WorkOrderRepository workOrderRepository;
    @Mock
    private WorkOrderPartLineRepository partLineRepository;
    @Mock
    private InventoryServiceClient inventoryServiceClient;

    private WorkOrder workOrder;
    private WorkOrderPartLine partLine;
    private WorkOrderPartTransaction transaction;
    private Jwt jwt;

    @BeforeEach
    void setUp() {
        transaction = new WorkOrderPartTransaction(
                workOrderRepository, partLineRepository, inventoryServiceClient);
        workOrder = WorkOrder.builder().id(workOrderId).status(WorkOrderStatus.IN_PROGRESS).build();
        Estimate estimate = Estimate.builder()
                .id(UUID.randomUUID())
                .workOrder(workOrder)
                .status(EstimateStatus.APPROVED)
                .build();
        partLine = WorkOrderPartLine.builder()
                .id(partLineId)
                .estimate(estimate)
                .partId(partId)
                .snapshotName("Brake pad")
                .snapshotSku("BRK-01")
                .snapshotUnit("EA")
                .requestedQuantity(4)
                .reservedQuantity(4)
                .issuedQuantity(0)
                .releasedQuantity(0)
                .unitPrice(BigDecimal.TEN)
                .totalPrice(BigDecimal.valueOf(40))
                .status(WorkOrderPartStatus.RESERVED)
                .createdAt(Instant.now())
                .build();
        jwt = Jwt.withTokenValue("token")
                .header("alg", "none")
                .claim("userId", actorId.toString())
                .build();
        given(workOrderRepository.findByIdForUpdate(workOrderId)).willReturn(Optional.of(workOrder));
        given(partLineRepository.findByIdAndEstimate_WorkOrder_IdForUpdate(partLineId, workOrderId))
                .willReturn(Optional.of(partLine));
        lenient().when(partLineRepository.save(any(WorkOrderPartLine.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));
    }

    @Test
    void issue_partiallyTracksIssuedQuantityAndUsesDeterministicIdempotencyKey() {
        given(inventoryServiceClient.issueReservedPart(any()))
                .willAnswer(invocation -> inventoryResponse("EXPORT", 2));

        var response = transaction.issue(workOrderId, partLineId, 2, jwt);

        assertThat(response.issuedQuantity()).isEqualTo(2);
        assertThat(response.releasedQuantity()).isZero();
        assertThat(response.status()).isEqualTo(WorkOrderPartStatus.RESERVED);
        ArgumentCaptor<InternalPartStockCommand> command = ArgumentCaptor.forClass(InternalPartStockCommand.class);
        verify(inventoryServiceClient).issueReservedPart(command.capture());
        assertThat(command.getValue().workOrderId()).isEqualTo(workOrderId);
        assertThat(command.getValue().partId()).isEqualTo(partId);
        assertThat(command.getValue().requestedBy()).isEqualTo(actorId);
        assertThat(command.getValue().idempotencyKey()).contains(partLineId.toString(), "issue-0-0");
    }

    @Test
    void releaseRemainingQuantity_marksLineIssuedWhenNoReservationRemains() {
        partLine.setIssuedQuantity(2);
        partLine.setStatus(WorkOrderPartStatus.RESERVED);
        given(inventoryServiceClient.releaseReservedPart(any()))
                .willAnswer(invocation -> inventoryResponse("RELEASE", 2));

        var response = transaction.release(workOrderId, partLineId, 2, jwt);

        assertThat(response.issuedQuantity()).isEqualTo(2);
        assertThat(response.releasedQuantity()).isEqualTo(2);
        assertThat(response.status()).isEqualTo(WorkOrderPartStatus.ISSUED);
    }

    @Test
    void issue_rejectsQuantityAboveRemainingReservationBeforeCallingInventory() {
        partLine.setIssuedQuantity(3);

        assertThatThrownBy(() -> transaction.issue(workOrderId, partLineId, 2, jwt))
                .hasMessageContaining("không vượt quá");

        verify(inventoryServiceClient, never()).issueReservedPart(any());
    }

    private ServiceApiResponse<InternalInventoryTransactionContract> inventoryResponse(String type, int quantity) {
        return new ServiceApiResponse<>(0, "Success", new InternalInventoryTransactionContract(
                UUID.randomUUID(), partId, type, quantity, workOrderId));
    }
}
