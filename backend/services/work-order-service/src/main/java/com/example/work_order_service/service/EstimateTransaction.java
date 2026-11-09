package com.example.work_order_service.service;

import com.example.work_order_service.dto.request.AddPartToEstimateRequest;
import com.example.work_order_service.dto.request.AddServiceToEstimateRequest;
import com.example.work_order_service.dto.request.CreateEstimateRequest;
import com.example.work_order_service.dto.request.EstimateDecisionRequest;
import com.example.work_order_service.dto.request.EstimateItemDecisionRequest;
import com.example.work_order_service.dto.response.EstimateResponse;
import com.example.work_order_service.dto.response.EstimateSummaryResponse;
import com.example.work_order_service.entity.Estimate;
import com.example.work_order_service.entity.WorkOrder;
import com.example.work_order_service.entity.WorkOrderPartLine;
import com.example.work_order_service.entity.WorkOrderServiceLine;
import com.example.work_order_service.entity.WorkOrderStatusHistory;
import com.example.work_order_service.enums.EstimateItemDecision;
import com.example.work_order_service.enums.EstimateItemType;
import com.example.work_order_service.enums.EstimateStatus;
import com.example.work_order_service.enums.EstimateType;
import com.example.work_order_service.enums.WorkOrderPartStatus;
import com.example.work_order_service.enums.WorkOrderServiceStatus;
import com.example.work_order_service.enums.WorkOrderStatus;
import com.example.work_order_service.exception.ApiException;
import com.example.work_order_service.exception.ErrorCode;
import com.example.work_order_service.integration.ServiceEstimateCatalog;
import com.example.work_order_service.integration.contract.InternalPartCatalogContract;
import com.example.work_order_service.integration.contract.InternalServiceBomContract;
import com.example.work_order_service.integration.contract.InternalServiceCatalogContract;
import com.example.work_order_service.mapper.EstimateMapper;
import com.example.work_order_service.messaging.event.PartReservationItem;
import com.example.work_order_service.messaging.event.PartsReservationRequestedEvent;
import com.example.work_order_service.messaging.producer.PartsReservationRequestPublisher;
import com.example.work_order_service.repository.EstimateRepository;
import com.example.work_order_service.repository.WorkOrderPartLineRepository;
import com.example.work_order_service.repository.WorkOrderRepository;
import com.example.work_order_service.repository.WorkOrderServiceLineRepository;
import com.example.work_order_service.repository.WorkOrderStatusHistoryRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.function.Consumer;

@Service
@RequiredArgsConstructor
public class EstimateTransaction {

    private final WorkOrderRepository workOrderRepository;
    private final WorkOrderStatusHistoryRepository statusHistoryRepository;
    private final EstimateRepository estimateRepository;
    private final WorkOrderServiceLineRepository serviceLineRepository;
    private final WorkOrderPartLineRepository partLineRepository;
    private final EstimateMapper mapper;
    private final PartsReservationRequestPublisher reservationRequestPublisher;

    @Transactional
    public EstimateResponse create(UUID workOrderId, CreateEstimateRequest request, UUID createdBy) {
        WorkOrder workOrder = workOrderRepository.findById(workOrderId)
                .orElseThrow(() -> new ApiException(ErrorCode.WORK_ORDER_NOT_FOUND));
        Estimate estimate = estimateRepository.save(Estimate.builder()
                .code("EST-" + UUID.randomUUID())
                .workOrder(workOrder)
                .type(request.type())
                .status(EstimateStatus.DRAFT)
                .createdBy(createdBy)
                .build());
        return toResponse(estimate);
    }

    @Transactional(readOnly = true)
    public List<EstimateSummaryResponse> list(UUID workOrderId) {
        if (!workOrderRepository.existsById(workOrderId)) {
            throw new ApiException(ErrorCode.WORK_ORDER_NOT_FOUND);
        }
        return estimateRepository.findByWorkOrder_IdOrderByCreatedAtAsc(workOrderId).stream()
                .map(mapper::toSummary)
                .toList();
    }

    @Transactional(readOnly = true)
    public EstimateResponse get(UUID estimateId) {
        return toResponse(findEstimate(estimateId));
    }

    @Transactional
    public EstimateResponse addService(
            UUID estimateId,
            AddServiceToEstimateRequest request,
            ServiceEstimateCatalog catalog
    ) {
        Estimate estimate = findEstimateForUpdate(estimateId);
        requireDraft(estimate);

        InternalServiceCatalogContract service = catalog.service();
        WorkOrderServiceLine serviceLine = serviceLineRepository.saveAndFlush(WorkOrderServiceLine.builder()
                .estimate(estimate)
                .serviceId(service.id())
                .snapshotName(service.name())
                .durationMinutes(service.durationMinutes())
                .requiredTechs(service.requiredTechs())
                .unitPrice(service.baseLaborPrice())
                .totalPrice(service.baseLaborPrice())
                .status(WorkOrderServiceStatus.PENDING)
                .build());

        List<WorkOrderPartLine> partLines = catalog.bom().stream()
                .map(item -> toPartLine(estimate, serviceLine, item))
                .toList();
        partLineRepository.saveAll(partLines);
        updateTotals(estimate);
        estimateRepository.save(estimate);
        return toResponse(estimate);
    }

    private void moveInitialWorkOrderToInProgress(Estimate estimate, UUID changedBy) {
        WorkOrder workOrder = workOrderRepository.findByIdForUpdate(estimate.getWorkOrder().getId())
                .orElseThrow(() -> new ApiException(ErrorCode.WORK_ORDER_NOT_FOUND));
        if (workOrder.getStatus() != WorkOrderStatus.PENDING_APPROVAL) {
            throw new ApiException(ErrorCode.INVALID_WORK_ORDER_STATUS_TRANSITION,
                    "Work Order không còn chờ quyết định Estimate ban đầu");
        }
        workOrder.setStatus(WorkOrderStatus.IN_PROGRESS);
        workOrderRepository.saveAndFlush(workOrder);
        statusHistoryRepository.save(WorkOrderStatusHistory.builder()
                .workOrder(workOrder)
                .statusFrom(WorkOrderStatus.PENDING_APPROVAL.name())
                .statusTo(WorkOrderStatus.IN_PROGRESS.name())
                .changedBy(changedBy)
                .note("Initial Estimate approved; no parts require reservation")
                .build());
    }

    @Transactional
    public void removeService(UUID estimateId, UUID serviceLineId) {
        Estimate estimate = findEstimateForUpdate(estimateId);
        requireEditableBeforeDecision(estimate);
        WorkOrderServiceLine serviceLine = serviceLineRepository.findByIdAndEstimate_Id(serviceLineId, estimateId)
                .orElseThrow(() -> new ApiException(ErrorCode.SERVICE_LINE_NOT_FOUND));
        partLineRepository.deleteBySourceServiceLineId(serviceLine.getId());
        serviceLineRepository.delete(serviceLine);
        updateTotals(estimate);
        estimateRepository.save(estimate);
    }

    @Transactional
    public EstimateResponse addPart(
            UUID estimateId,
            AddPartToEstimateRequest request,
            InternalPartCatalogContract part
    ) {
        Estimate estimate = findEstimateForUpdate(estimateId);
        requireDraft(estimate);
        BigDecimal totalPrice = part.sellingPrice().multiply(BigDecimal.valueOf(request.quantity()));
        partLineRepository.saveAndFlush(WorkOrderPartLine.builder()
                .estimate(estimate)
                .partId(part.id())
                .snapshotName(part.name())
                .snapshotSku(part.sku())
                .snapshotUnit(part.unit())
                .requestedQuantity(request.quantity())
                .reservedQuantity(0)
                .issuedQuantity(0)
                .releasedQuantity(0)
                .unitPrice(part.sellingPrice())
                .totalPrice(totalPrice)
                .status(WorkOrderPartStatus.PENDING)
                .build());
        updateTotals(estimate);
        estimateRepository.save(estimate);
        return toResponse(estimate);
    }

    @Transactional
    public void removePart(UUID estimateId, UUID partLineId) {
        Estimate estimate = findEstimateForUpdate(estimateId);
        requireEditableBeforeDecision(estimate);
        WorkOrderPartLine partLine = partLineRepository.findByIdAndEstimate_Id(partLineId, estimateId)
                .orElseThrow(() -> new ApiException(ErrorCode.PART_LINE_NOT_FOUND));
        partLineRepository.delete(partLine);
        updateTotals(estimate);
        estimateRepository.save(estimate);
    }

    @Transactional
    public EstimateResponse submit(UUID estimateId, UUID submittedBy) {
        Estimate estimate = findEstimateForUpdate(estimateId);
        requireDraft(estimate);

        WorkOrder workOrder = workOrderRepository.findByIdForUpdate(estimate.getWorkOrder().getId())
                .orElseThrow(() -> new ApiException(ErrorCode.WORK_ORDER_NOT_FOUND));
        if (estimate.getType() == EstimateType.INITIAL
                && workOrder.getStatus() == WorkOrderStatus.DIAGNOSING) {
            workOrder.setStatus(WorkOrderStatus.PENDING_APPROVAL);
            workOrderRepository.saveAndFlush(workOrder);
            statusHistoryRepository.save(WorkOrderStatusHistory.builder()
                    .workOrder(workOrder)
                    .statusFrom(WorkOrderStatus.DIAGNOSING.name())
                    .statusTo(WorkOrderStatus.PENDING_APPROVAL.name())
                    .changedBy(submittedBy)
                    .note("Estimate submitted for customer approval")
                    .build());
        } else if (estimate.getType() != EstimateType.SUPPLEMENTARY
                || workOrder.getStatus() != WorkOrderStatus.IN_PROGRESS) {
            throw new ApiException(ErrorCode.INVALID_WORK_ORDER_STATUS_TRANSITION,
                    "Estimate không thể gửi ở trạng thái Work Order hiện tại");
        }

        estimate.setStatus(EstimateStatus.PENDING_APPROVAL);
        estimateRepository.save(estimate);
        return toResponse(estimate);
    }

    @Transactional
    public EstimateResponse decide(UUID estimateId, EstimateDecisionRequest request, UUID decidedBy) {
        Estimate estimate = findEstimateForUpdate(estimateId);
        if (estimate.getStatus() != EstimateStatus.PENDING_APPROVAL) {
            throw new ApiException(ErrorCode.ESTIMATE_NOT_EDITABLE);
        }

        List<WorkOrderServiceLine> serviceLines =
                serviceLineRepository.findByEstimate_IdOrderByCreatedAtAsc(estimateId);
        List<WorkOrderPartLine> partLines =
                partLineRepository.findByEstimate_IdOrderByCreatedAtAsc(estimateId);
        Set<DecisionKey> decidedItems = new HashSet<>();

        for (EstimateItemDecisionRequest item : request.items()) {
            if (!decidedItems.add(new DecisionKey(item.itemType(), item.itemId()))) {
                throw new ApiException(ErrorCode.INVALID_REQUEST, "Hạng mục bị lặp trong quyết định");
            }
            if (item.itemType() == EstimateItemType.SERVICE) {
                WorkOrderServiceLine line = serviceLines.stream()
                        .filter(candidate -> candidate.getId().equals(item.itemId()))
                        .findFirst()
                        .orElseThrow(() -> new ApiException(ErrorCode.SERVICE_LINE_NOT_FOUND));
                applyDecision(line.getStatus(), item.decision(), line::setStatus);
            } else {
                WorkOrderPartLine line = partLines.stream()
                        .filter(candidate -> candidate.getId().equals(item.itemId()))
                        .findFirst()
                        .orElseThrow(() -> new ApiException(ErrorCode.PART_LINE_NOT_FOUND));
                applyDecision(line.getStatus(), item.decision(), line::setStatus);
            }
        }

        boolean hasPendingItems = serviceLines.stream()
                .anyMatch(line -> line.getStatus() == WorkOrderServiceStatus.PENDING)
                || partLines.stream().anyMatch(line -> line.getStatus() == WorkOrderPartStatus.PENDING);
        if (!hasPendingItems) {
            long approvedCount = serviceLines.stream()
                    .filter(line -> line.getStatus() == WorkOrderServiceStatus.APPROVED)
                    .count()
                    + partLines.stream().filter(line -> line.getStatus() == WorkOrderPartStatus.APPROVED).count();
            long rejectedCount = serviceLines.stream()
                    .filter(line -> line.getStatus() == WorkOrderServiceStatus.REJECTED)
                    .count()
                    + partLines.stream().filter(line -> line.getStatus() == WorkOrderPartStatus.REJECTED).count();
            if (approvedCount == 0) {
                estimate.setStatus(EstimateStatus.REJECTED);
            } else if (rejectedCount == 0) {
                estimate.setStatus(EstimateStatus.APPROVED);
            } else {
                estimate.setStatus(EstimateStatus.PARTIALLY_APPROVED);
            }
            if (estimate.getStatus() == EstimateStatus.REJECTED
                    && estimate.getType() == EstimateType.INITIAL) {
                cancelRejectedInitialWorkOrder(estimate, decidedBy);
            }
        }

        estimateRepository.save(estimate);
        if (estimate.getStatus() == EstimateStatus.APPROVED
                || estimate.getStatus() == EstimateStatus.PARTIALLY_APPROVED) {
            List<WorkOrderPartLine> approvedParts = partLines.stream()
                    .filter(line -> line.getStatus() == WorkOrderPartStatus.APPROVED)
                    .toList();
            if (approvedParts.isEmpty() && estimate.getType() == EstimateType.INITIAL) {
                moveInitialWorkOrderToInProgress(estimate, decidedBy);
            } else if (!approvedParts.isEmpty()) {
                reservationRequestPublisher.publish(new PartsReservationRequestedEvent(
                        UUID.randomUUID(),
                        estimate.getWorkOrder().getId(),
                        estimate.getId(),
                        decidedBy,
                        approvedParts.stream()
                                .map(line -> new PartReservationItem(
                                        line.getId(), line.getPartId(), line.getRequestedQuantity()))
                                .toList()));
            }
        }
        return toResponse(estimate);
    }

    private void cancelRejectedInitialWorkOrder(Estimate estimate, UUID decidedBy) {
        WorkOrder workOrder = workOrderRepository.findByIdForUpdate(estimate.getWorkOrder().getId())
                .orElseThrow(() -> new ApiException(ErrorCode.WORK_ORDER_NOT_FOUND));
        if (workOrder.getStatus() != WorkOrderStatus.PENDING_APPROVAL) {
            throw new ApiException(ErrorCode.INVALID_WORK_ORDER_STATUS_TRANSITION,
                    "Work Order không còn chờ quyết định Estimate ban đầu");
        }
        workOrder.setStatus(WorkOrderStatus.CANCELED);
        workOrderRepository.saveAndFlush(workOrder);
        statusHistoryRepository.save(WorkOrderStatusHistory.builder()
                .workOrder(workOrder)
                .statusFrom(WorkOrderStatus.PENDING_APPROVAL.name())
                .statusTo(WorkOrderStatus.CANCELED.name())
                .changedBy(decidedBy)
                .note("Initial Estimate rejected by customer")
                .build());
    }

    private void applyDecision(
            WorkOrderServiceStatus currentStatus,
            EstimateItemDecision decision,
            Consumer<WorkOrderServiceStatus> updateStatus
    ) {
        WorkOrderServiceStatus targetStatus = decision == EstimateItemDecision.APPROVED
                ? WorkOrderServiceStatus.APPROVED : WorkOrderServiceStatus.REJECTED;
        if (currentStatus == WorkOrderServiceStatus.PENDING) {
            updateStatus.accept(targetStatus);
        } else if (currentStatus != targetStatus) {
            throw new ApiException(ErrorCode.ESTIMATE_ITEM_DECISION_CONFLICT);
        }
    }

    private void applyDecision(
            WorkOrderPartStatus currentStatus,
            EstimateItemDecision decision,
            Consumer<WorkOrderPartStatus> updateStatus
    ) {
        WorkOrderPartStatus targetStatus = decision == EstimateItemDecision.APPROVED
                ? WorkOrderPartStatus.APPROVED : WorkOrderPartStatus.REJECTED;
        if (currentStatus == WorkOrderPartStatus.PENDING) {
            updateStatus.accept(targetStatus);
        } else if (currentStatus != targetStatus) {
            throw new ApiException(ErrorCode.ESTIMATE_ITEM_DECISION_CONFLICT);
        }
    }

    private WorkOrderPartLine toPartLine(
            Estimate estimate,
            WorkOrderServiceLine serviceLine,
            InternalServiceBomContract item
    ) {
        int requestedQuantity = item.defaultQuantity();
        BigDecimal totalPrice = item.sellingPrice().multiply(BigDecimal.valueOf(requestedQuantity));
        return WorkOrderPartLine.builder()
                .estimate(estimate)
                .sourceServiceLineId(serviceLine.getId())
                .partId(item.partId())
                .snapshotName(item.partName())
                .snapshotSku(item.partSku())
                .snapshotUnit(item.partUnit())
                .requestedQuantity(requestedQuantity)
                .reservedQuantity(0)
                .issuedQuantity(0)
                .releasedQuantity(0)
                .unitPrice(item.sellingPrice())
                .totalPrice(totalPrice)
                .status(WorkOrderPartStatus.PENDING)
                .build();
    }

    private void updateTotals(Estimate estimate) {
        BigDecimal laborAmount = serviceLineRepository.findByEstimate_IdOrderByCreatedAtAsc(estimate.getId()).stream()
                .map(WorkOrderServiceLine::getTotalPrice)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal partsAmount = partLineRepository.findByEstimate_IdOrderByCreatedAtAsc(estimate.getId()).stream()
                .map(WorkOrderPartLine::getTotalPrice)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        estimate.setTotalLaborAmount(laborAmount);
        estimate.setTotalPartsAmount(partsAmount);
        estimate.setTotalAmount(laborAmount.add(partsAmount));
    }

    private EstimateResponse toResponse(Estimate estimate) {
        UUID estimateId = estimate.getId();
        return mapper.toResponse(
                estimate,
                serviceLineRepository.findByEstimate_IdOrderByCreatedAtAsc(estimateId),
                partLineRepository.findByEstimate_IdOrderByCreatedAtAsc(estimateId));
    }

    private Estimate findEstimate(UUID estimateId) {
        return estimateRepository.findById(estimateId)
                .orElseThrow(() -> new ApiException(ErrorCode.ESTIMATE_NOT_FOUND));
    }

    private Estimate findEstimateForUpdate(UUID estimateId) {
        return estimateRepository.findByIdForUpdate(estimateId)
                .orElseThrow(() -> new ApiException(ErrorCode.ESTIMATE_NOT_FOUND));
    }

    private void requireDraft(Estimate estimate) {
        if (estimate.getStatus() != EstimateStatus.DRAFT) {
            throw new ApiException(ErrorCode.ESTIMATE_NOT_EDITABLE);
        }
    }

    private void requireEditableBeforeDecision(Estimate estimate) {
        if (estimate.getStatus() != EstimateStatus.DRAFT
                && estimate.getStatus() != EstimateStatus.PENDING_APPROVAL) {
            throw new ApiException(ErrorCode.ESTIMATE_NOT_EDITABLE);
        }
    }

    private record DecisionKey(EstimateItemType itemType, UUID itemId) {
    }
}
