package com.example.work_order_service.service;

import com.example.work_order_service.dto.response.WorkOrderPartLineResponse;
import com.example.work_order_service.entity.WorkOrder;
import com.example.work_order_service.entity.WorkOrderPartLine;
import com.example.work_order_service.enums.EstimateStatus;
import com.example.work_order_service.enums.WorkOrderPartStatus;
import com.example.work_order_service.enums.WorkOrderStatus;
import com.example.work_order_service.exception.ApiException;
import com.example.work_order_service.exception.ErrorCode;
import com.example.work_order_service.integration.client.InventoryServiceClient;
import com.example.work_order_service.integration.contract.InternalInventoryTransactionContract;
import com.example.work_order_service.integration.contract.InternalPartStockCommand;
import com.example.work_order_service.integration.contract.ServiceApiResponse;
import com.example.work_order_service.repository.WorkOrderPartLineRepository;
import com.example.work_order_service.repository.WorkOrderRepository;
import feign.FeignException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class WorkOrderPartTransaction {

    private final WorkOrderRepository workOrderRepository;
    private final WorkOrderPartLineRepository partLineRepository;
    private final InventoryServiceClient inventoryServiceClient;

    @Transactional
    public WorkOrderPartLineResponse issue(UUID workOrderId, UUID partLineId, int quantity, Jwt jwt) {
        return changeReservedQuantity(workOrderId, partLineId, quantity, requireUserId(jwt), true);
    }

    @Transactional
    public WorkOrderPartLineResponse release(UUID workOrderId, UUID partLineId, int quantity, Jwt jwt) {
        return changeReservedQuantity(workOrderId, partLineId, quantity, requireUserId(jwt), false);
    }

    @Transactional
    public void releaseOutstandingParts(UUID workOrderId, UUID actorId) {
        WorkOrder workOrder = workOrderRepository.findByIdForUpdate(workOrderId)
                .orElseThrow(() -> new ApiException(ErrorCode.WORK_ORDER_NOT_FOUND));
        if (workOrder.getStatus() != WorkOrderStatus.COMPLETED
                && workOrder.getStatus() != WorkOrderStatus.CANCELED) {
            throw new ApiException(ErrorCode.INVALID_WORK_ORDER_STATUS_TRANSITION,
                    "Chỉ có thể tự động giải phóng phụ tùng khi Work Order đã kết thúc");
        }

        List<WorkOrderPartLine> lines = partLineRepository.findByEstimate_WorkOrder_IdOrderByCreatedAtAsc(
                workOrderId);
        for (WorkOrderPartLine line : lines) {
            int remaining = remainingReserved(line);
            if (remaining > 0) {
                applyChange(workOrder, line, remaining, actorId, false);
            }
        }
    }

    private WorkOrderPartLineResponse changeReservedQuantity(
            UUID workOrderId,
            UUID partLineId,
            int quantity,
            UUID actorId,
            boolean issue
    ) {
        WorkOrder workOrder = workOrderRepository.findByIdForUpdate(workOrderId)
                .orElseThrow(() -> new ApiException(ErrorCode.WORK_ORDER_NOT_FOUND));
        if (workOrder.getStatus() != WorkOrderStatus.IN_PROGRESS) {
            throw new ApiException(ErrorCode.INVALID_WORK_ORDER_STATUS_TRANSITION,
                    "Chỉ có thể issue/release phụ tùng khi Work Order đang IN_PROGRESS");
        }
        WorkOrderPartLine line = partLineRepository.findByIdAndEstimate_WorkOrder_IdForUpdate(
                        partLineId, workOrderId)
                .orElseThrow(() -> new ApiException(ErrorCode.PART_LINE_NOT_FOUND));
        return applyChange(workOrder, line, quantity, actorId, issue);
    }

    private WorkOrderPartLineResponse applyChange(
            WorkOrder workOrder,
            WorkOrderPartLine line,
            int quantity,
            UUID actorId,
            boolean issue
    ) {
        EstimateStatus estimateStatus = line.getEstimate().getStatus();
        if (estimateStatus != EstimateStatus.APPROVED
                && estimateStatus != EstimateStatus.PARTIALLY_APPROVED) {
            throw new ApiException(ErrorCode.INVALID_WORK_ORDER_STATUS_TRANSITION,
                    "Part Line chưa thuộc Estimate đã được duyệt");
        }
        if (line.getStatus() != WorkOrderPartStatus.RESERVED
                && line.getStatus() != WorkOrderPartStatus.ISSUED) {
            throw new ApiException(ErrorCode.PART_RESERVATION_NOT_FOUND,
                    "Part Line chưa được Inventory reserve");
        }

        int remaining = remainingReserved(line);
        if (quantity <= 0 || quantity > remaining) {
            throw new ApiException(ErrorCode.INVALID_REQUEST,
                    "Số lượng phải lớn hơn 0 và không vượt quá phần đang giữ chỗ còn lại (" + remaining + ")");
        }

        String operation = issue ? "issue" : "release";
        int issuedBefore = line.getIssuedQuantity();
        int releasedBefore = line.getReleasedQuantity();
        String idempotencyKey = "wo-" + workOrder.getId() + "-part-" + line.getId() + "-"
                + operation + "-" + issuedBefore + "-" + releasedBefore;
        InternalPartStockCommand command = new InternalPartStockCommand(
                workOrder.getId(), line.getPartId(), quantity, idempotencyKey, actorId);

        ServiceApiResponse<InternalInventoryTransactionContract> result;
        try {
            result = issue
                    ? inventoryServiceClient.issueReservedPart(command)
                    : inventoryServiceClient.releaseReservedPart(command);
        } catch (FeignException exception) {
            log.warn("Inventory {} failed for Work Order {} Part Line {}: HTTP {}",
                    operation, workOrder.getId(), line.getId(), exception.status());
            if (exception.status() == 400) {
                throw new ApiException(ErrorCode.INVALID_REQUEST,
                        "Inventory Service từ chối lệnh " + operation);
            }
            if (exception.status() == 404) {
                throw new ApiException(ErrorCode.PART_RESERVATION_NOT_FOUND);
            }
            throw new ApiException(ErrorCode.INTEGRATION_SERVICE_UNAVAILABLE,
                    "Inventory Service không thể hoàn tất thao tác " + operation);
        }

        String expectedType = issue ? "EXPORT" : "RELEASE";
        if (result == null || result.code() != 0 || result.result() == null
                || result.result().id() == null
                || !line.getPartId().equals(result.result().partId())
                || !workOrder.getId().equals(result.result().referenceId())
                || !expectedType.equals(result.result().type())
                || !Integer.valueOf(quantity).equals(result.result().quantity())) {
            throw new ApiException(ErrorCode.INTEGRATION_SERVICE_UNAVAILABLE,
                    "Inventory Service trả về kết quả không hợp lệ");
        }

        if (issue) {
            line.setIssuedQuantity(issuedBefore + quantity);
        } else {
            line.setReleasedQuantity(releasedBefore + quantity);
        }
        if (remainingReserved(line) == 0 && line.getIssuedQuantity() > 0) {
            line.setStatus(WorkOrderPartStatus.ISSUED);
        }
        WorkOrderPartLine saved = partLineRepository.save(line);
        return toResponse(saved);
    }

    private int remainingReserved(WorkOrderPartLine line) {
        int reserved = line.getReservedQuantity() == null ? 0 : line.getReservedQuantity();
        int issued = line.getIssuedQuantity() == null ? 0 : line.getIssuedQuantity();
        int released = line.getReleasedQuantity() == null ? 0 : line.getReleasedQuantity();
        if (reserved < 0 || issued < 0 || released < 0 || issued + released > reserved) {
            throw new ApiException(ErrorCode.INVALID_REQUEST, "Số lượng đã theo dõi của Part Line không hợp lệ");
        }
        return reserved - issued - released;
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

    private WorkOrderPartLineResponse toResponse(WorkOrderPartLine line) {
        return new WorkOrderPartLineResponse(
                line.getId(),
                line.getSourceServiceLineId(),
                line.getPartId(),
                line.getSnapshotName(),
                line.getSnapshotSku(),
                line.getSnapshotUnit(),
                line.getRequestedQuantity(),
                line.getReservedQuantity(),
                line.getIssuedQuantity(),
                line.getReleasedQuantity(),
                line.getUnitPrice(),
                line.getTotalPrice(),
                line.getStatus(),
                line.getCreatedAt());
    }
}
