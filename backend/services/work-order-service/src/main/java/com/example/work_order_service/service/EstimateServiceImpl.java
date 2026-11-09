package com.example.work_order_service.service;

import com.example.work_order_service.dto.request.AddServiceToEstimateRequest;
import com.example.work_order_service.dto.request.AddPartToEstimateRequest;
import com.example.work_order_service.dto.request.EstimateDecisionRequest;
import com.example.work_order_service.dto.request.CreateEstimateRequest;
import com.example.work_order_service.dto.response.EstimateResponse;
import com.example.work_order_service.dto.response.EstimateSummaryResponse;
import com.example.work_order_service.enums.EstimateStatus;
import com.example.work_order_service.exception.ApiException;
import com.example.work_order_service.exception.ErrorCode;
import com.example.work_order_service.integration.WorkOrderIntegrationService;
import com.example.work_order_service.repository.EstimateRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class EstimateServiceImpl implements EstimateService {

    private final EstimateTransaction estimateTransaction;
    private final EstimateRepository estimateRepository;
    private final WorkOrderIntegrationService integrationService;

    @Override
    public EstimateResponse create(UUID workOrderId, CreateEstimateRequest request, Jwt jwt) {
        return estimateTransaction.create(workOrderId, request, requireUserId(jwt));
    }

    @Override
    public List<EstimateSummaryResponse> list(UUID workOrderId) {
        return estimateTransaction.list(workOrderId);
    }

    @Override
    public EstimateResponse get(UUID estimateId) {
        return estimateTransaction.get(estimateId);
    }

    @Override
    public EstimateResponse addService(UUID estimateId, AddServiceToEstimateRequest request) {
        var estimate = estimateRepository.findById(estimateId)
                .orElseThrow(() -> new ApiException(ErrorCode.ESTIMATE_NOT_FOUND));
        if (estimate.getStatus() != EstimateStatus.DRAFT) {
            throw new ApiException(ErrorCode.ESTIMATE_NOT_EDITABLE);
        }
        var catalog = integrationService.getServiceEstimateCatalog(request.serviceId());
        return estimateTransaction.addService(estimateId, request, catalog);
    }

    @Override
    public void removeService(UUID estimateId, UUID serviceLineId) {
        estimateTransaction.removeService(estimateId, serviceLineId);
    }

    @Override
    public EstimateResponse addPart(UUID estimateId, AddPartToEstimateRequest request) {
        var estimate = estimateRepository.findById(estimateId)
                .orElseThrow(() -> new ApiException(ErrorCode.ESTIMATE_NOT_FOUND));
        if (estimate.getStatus() != EstimateStatus.DRAFT) {
            throw new ApiException(ErrorCode.ESTIMATE_NOT_EDITABLE);
        }
        var part = integrationService.getPartCatalog(request.partId());
        return estimateTransaction.addPart(estimateId, request, part);
    }

    @Override
    public void removePart(UUID estimateId, UUID partLineId) {
        estimateTransaction.removePart(estimateId, partLineId);
    }

    @Override
    public EstimateResponse submit(UUID estimateId, Jwt jwt) {
        return estimateTransaction.submit(estimateId, requireUserId(jwt));
    }

    @Override
    public EstimateResponse decide(UUID estimateId, EstimateDecisionRequest request, Jwt jwt) {
        return estimateTransaction.decide(estimateId, request, requireUserId(jwt));
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
}
