package com.example.work_order_service.service;

import com.example.work_order_service.dto.request.AddServiceToEstimateRequest;
import com.example.work_order_service.dto.request.CreateEstimateRequest;
import com.example.work_order_service.dto.response.EstimateResponse;
import com.example.work_order_service.dto.response.EstimateSummaryResponse;
import com.example.work_order_service.entity.Estimate;
import com.example.work_order_service.entity.WorkOrder;
import com.example.work_order_service.entity.WorkOrderPartLine;
import com.example.work_order_service.entity.WorkOrderServiceLine;
import com.example.work_order_service.enums.EstimateStatus;
import com.example.work_order_service.enums.WorkOrderPartStatus;
import com.example.work_order_service.enums.WorkOrderServiceStatus;
import com.example.work_order_service.exception.ApiException;
import com.example.work_order_service.exception.ErrorCode;
import com.example.work_order_service.integration.ServiceEstimateCatalog;
import com.example.work_order_service.integration.contract.InternalServiceBomContract;
import com.example.work_order_service.integration.contract.InternalServiceCatalogContract;
import com.example.work_order_service.mapper.EstimateMapper;
import com.example.work_order_service.repository.EstimateRepository;
import com.example.work_order_service.repository.WorkOrderPartLineRepository;
import com.example.work_order_service.repository.WorkOrderRepository;
import com.example.work_order_service.repository.WorkOrderServiceLineRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class EstimateTransaction {

    private final WorkOrderRepository workOrderRepository;
    private final EstimateRepository estimateRepository;
    private final WorkOrderServiceLineRepository serviceLineRepository;
    private final WorkOrderPartLineRepository partLineRepository;
    private final EstimateMapper mapper;

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

    @Transactional
    public void removeService(UUID estimateId, UUID serviceLineId) {
        Estimate estimate = findEstimateForUpdate(estimateId);
        if (estimate.getStatus() != EstimateStatus.DRAFT
                && estimate.getStatus() != EstimateStatus.PENDING_APPROVAL) {
            throw new ApiException(ErrorCode.ESTIMATE_NOT_EDITABLE);
        }
        WorkOrderServiceLine serviceLine = serviceLineRepository.findByIdAndEstimate_Id(serviceLineId, estimateId)
                .orElseThrow(() -> new ApiException(ErrorCode.SERVICE_LINE_NOT_FOUND));
        partLineRepository.deleteBySourceServiceLineId(serviceLine.getId());
        serviceLineRepository.delete(serviceLine);
        updateTotals(estimate);
        estimateRepository.save(estimate);
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
}
