package com.example.work_order_service.service;

import com.example.work_order_service.dto.request.AddServiceToEstimateRequest;
import com.example.work_order_service.dto.request.AddPartToEstimateRequest;
import com.example.work_order_service.dto.request.EstimateDecisionRequest;
import com.example.work_order_service.dto.request.CreateEstimateRequest;
import com.example.work_order_service.dto.response.EstimateResponse;
import com.example.work_order_service.dto.response.EstimateSummaryResponse;
import org.springframework.security.oauth2.jwt.Jwt;

import java.util.List;
import java.util.UUID;

public interface EstimateService {

    EstimateResponse create(UUID workOrderId, CreateEstimateRequest request, Jwt jwt);

    List<EstimateSummaryResponse> list(UUID workOrderId);

    EstimateResponse get(UUID estimateId);

    EstimateResponse addService(UUID estimateId, AddServiceToEstimateRequest request);

    void removeService(UUID estimateId, UUID serviceLineId);

    EstimateResponse addPart(UUID estimateId, AddPartToEstimateRequest request);

    void removePart(UUID estimateId, UUID partLineId);

    EstimateResponse submit(UUID estimateId, Jwt jwt);

    EstimateResponse decide(UUID estimateId, EstimateDecisionRequest request, Jwt jwt);
}
