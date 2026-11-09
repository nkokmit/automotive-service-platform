package com.example.work_order_service.controller;

import com.example.work_order_service.common.ApiResponse;
import com.example.work_order_service.dto.request.AssignMechanicRequest;
import com.example.work_order_service.dto.response.AssignedServiceLineResponse;
import com.example.work_order_service.enums.WorkOrderServiceStatus;
import com.example.work_order_service.service.WorkOrderServiceLineService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequiredArgsConstructor
public class WorkOrderServiceLineController {

    private final WorkOrderServiceLineService service;

    @PatchMapping("/api/work-order-service-lines/{serviceLineId}/assign")
    public ApiResponse<AssignedServiceLineResponse> assign(
            @PathVariable UUID serviceLineId,
            @Valid @RequestBody AssignMechanicRequest request
    ) {
        return ApiResponse.success("Phân công mechanic thành công",
                service.assign(serviceLineId, request));
    }

    @GetMapping("/api/me/work-order-service-lines")
    public ApiResponse<List<AssignedServiceLineResponse>> getMyLines(
            @RequestParam(required = false) WorkOrderServiceStatus status,
            @AuthenticationPrincipal Jwt jwt
    ) {
        return ApiResponse.success(service.getMyLines(status, jwt));
    }

    @PostMapping("/api/work-order-service-lines/{serviceLineId}/start")
    public ApiResponse<AssignedServiceLineResponse> start(
            @PathVariable UUID serviceLineId,
            @AuthenticationPrincipal Jwt jwt
    ) {
        return ApiResponse.success(service.start(serviceLineId, jwt));
    }

    @PostMapping("/api/work-order-service-lines/{serviceLineId}/complete")
    public ApiResponse<AssignedServiceLineResponse> complete(
            @PathVariable UUID serviceLineId,
            @AuthenticationPrincipal Jwt jwt
    ) {
        return ApiResponse.success(service.complete(serviceLineId, jwt));
    }
}
