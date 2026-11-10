package com.example.work_order_service.controller;

import com.example.work_order_service.common.ApiResponse;
import com.example.work_order_service.dto.request.CreateEstimateRequest;
import com.example.work_order_service.dto.request.CreateWorkOrderRequest;
import com.example.work_order_service.dto.response.EstimateResponse;
import com.example.work_order_service.dto.response.EstimateSummaryResponse;
import com.example.work_order_service.dto.response.WorkOrderPageResponse;
import com.example.work_order_service.dto.response.WorkOrderResponse;
import com.example.work_order_service.enums.WorkOrderStatus;
import com.example.work_order_service.service.WorkOrderCreateResult;
import com.example.work_order_service.service.EstimateService;
import com.example.work_order_service.service.WorkOrderService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/work-orders")
@RequiredArgsConstructor
public class WorkOrderController {

    private final WorkOrderService workOrderService;
    private final EstimateService estimateService;

    @PostMapping
    public ResponseEntity<ApiResponse<WorkOrderResponse>> create(
            @Valid @RequestBody CreateWorkOrderRequest request,
            @AuthenticationPrincipal Jwt jwt
    ) {
        WorkOrderCreateResult result = workOrderService.create(request, jwt);
        HttpStatus status = result.created() ? HttpStatus.CREATED : HttpStatus.OK;
        String message = result.created() ? "Tạo Work Order thành công" : "Work Order đã tồn tại";
        return ResponseEntity.status(status)
                .body(ApiResponse.success(message, result.workOrder()));
    }

    @PostMapping("/{id}/estimates")
    public ResponseEntity<ApiResponse<EstimateResponse>> createEstimate(
            @PathVariable UUID id,
            @Valid @RequestBody CreateEstimateRequest request,
            @AuthenticationPrincipal Jwt jwt
    ) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Tạo Estimate thành công", estimateService.create(id, request, jwt)));
    }

    @GetMapping("/{id}/estimates")
    public ApiResponse<List<EstimateSummaryResponse>> getEstimates(@PathVariable UUID id) {
        return ApiResponse.success(estimateService.list(id));
    }

    @PostMapping("/{id}/start-diagnosis")
    public ApiResponse<WorkOrderResponse> startDiagnosis(
            @PathVariable UUID id,
            @AuthenticationPrincipal Jwt jwt
    ) {
        return ApiResponse.success("Bắt đầu chẩn đoán Work Order thành công",
                workOrderService.startDiagnosis(id, jwt));
    }

    @PostMapping("/{id}/complete")
    public ApiResponse<WorkOrderResponse> complete(
            @PathVariable UUID id,
            @AuthenticationPrincipal Jwt jwt
    ) {
        return ApiResponse.success("Hoàn thành Work Order thành công", workOrderService.complete(id, jwt));
    }

    @GetMapping("/{id}")
    public ApiResponse<WorkOrderResponse> get(@PathVariable UUID id) {
        return ApiResponse.success(workOrderService.get(id));
    }

    @GetMapping
    public ApiResponse<WorkOrderPageResponse> search(
            @RequestParam(required = false) WorkOrderStatus status,
            @RequestParam(required = false) UUID customerId,
            @RequestParam(required = false) UUID vehicleId,
            @RequestParam(required = false) UUID bookingId,
            @RequestParam(required = false) UUID assignedTechId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant to,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        return ApiResponse.success(workOrderService.search(
                status, customerId, vehicleId, bookingId, assignedTechId, from, to, page, size));
    }
}
