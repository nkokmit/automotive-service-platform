package com.example.work_order_service.controller;

import com.example.work_order_service.common.ApiResponse;
import com.example.work_order_service.dto.request.AddServiceToEstimateRequest;
import com.example.work_order_service.dto.response.EstimateResponse;
import com.example.work_order_service.service.EstimateService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
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
}
