package com.example.work_order_service.controller;

import com.example.work_order_service.common.ApiResponse;
import com.example.work_order_service.dto.request.AddPartToEstimateRequest;
import com.example.work_order_service.dto.request.AddServiceToEstimateRequest;
import com.example.work_order_service.dto.request.EstimateDecisionRequest;
import com.example.work_order_service.dto.response.EstimateResponse;
import com.example.work_order_service.service.EstimateService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/api/estimates")
@RequiredArgsConstructor
public class EstimateController {

    private final EstimateService estimateService;

    @GetMapping("/{estimateId}")
    public ApiResponse<EstimateResponse> get(@PathVariable UUID estimateId) {
        return ApiResponse.success(estimateService.get(estimateId));
    }

    @PostMapping("/{estimateId}/services")
    public ResponseEntity<ApiResponse<EstimateResponse>> addService(
            @PathVariable UUID estimateId,
            @Valid @RequestBody AddServiceToEstimateRequest request
    ) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Thêm dịch vụ vào Estimate thành công",
                        estimateService.addService(estimateId, request)));
    }

    @DeleteMapping("/{estimateId}/services/{serviceLineId}")
    public ResponseEntity<Void> removeService(
            @PathVariable UUID estimateId,
            @PathVariable UUID serviceLineId
    ) {
        estimateService.removeService(estimateId, serviceLineId);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{estimateId}/parts")
    public ResponseEntity<ApiResponse<EstimateResponse>> addPart(
            @PathVariable UUID estimateId,
            @Valid @RequestBody AddPartToEstimateRequest request
    ) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Thêm phụ tùng vào Estimate thành công",
                        estimateService.addPart(estimateId, request)));
    }

    @DeleteMapping("/{estimateId}/parts/{partLineId}")
    public ResponseEntity<Void> removePart(
            @PathVariable UUID estimateId,
            @PathVariable UUID partLineId
    ) {
        estimateService.removePart(estimateId, partLineId);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{estimateId}/submit")
    public ApiResponse<EstimateResponse> submit(
            @PathVariable UUID estimateId,
            @AuthenticationPrincipal Jwt jwt
    ) {
        return ApiResponse.success("Gửi Estimate chờ khách duyệt thành công",
                estimateService.submit(estimateId, jwt));
    }

    @PatchMapping("/{estimateId}/decision")
    public ApiResponse<EstimateResponse> decide(
            @PathVariable UUID estimateId,
            @Valid @RequestBody EstimateDecisionRequest request,
            @AuthenticationPrincipal Jwt jwt
    ) {
        return ApiResponse.success("Cập nhật quyết định Estimate thành công",
                estimateService.decide(estimateId, request, jwt));
    }
}
