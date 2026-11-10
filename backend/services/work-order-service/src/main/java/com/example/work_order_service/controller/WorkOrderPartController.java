package com.example.work_order_service.controller;

import com.example.work_order_service.common.ApiResponse;
import com.example.work_order_service.dto.request.PartQuantityRequest;
import com.example.work_order_service.dto.response.WorkOrderPartLineResponse;
import com.example.work_order_service.service.WorkOrderPartTransaction;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/api/work-orders/{workOrderId}/parts/{partLineId}")
@RequiredArgsConstructor
public class WorkOrderPartController {

    private final WorkOrderPartTransaction partTransaction;

    @PostMapping("/issue")
    public ApiResponse<WorkOrderPartLineResponse> issue(
            @PathVariable UUID workOrderId,
            @PathVariable UUID partLineId,
            @Valid @RequestBody PartQuantityRequest request,
            @AuthenticationPrincipal Jwt jwt
    ) {
        return ApiResponse.success("Xuất phụ tùng thành công",
                partTransaction.issue(workOrderId, partLineId, request.quantity(), jwt));
    }

    @PostMapping("/release")
    public ApiResponse<WorkOrderPartLineResponse> release(
            @PathVariable UUID workOrderId,
            @PathVariable UUID partLineId,
            @Valid @RequestBody PartQuantityRequest request,
            @AuthenticationPrincipal Jwt jwt
    ) {
        return ApiResponse.success("Giải phóng phụ tùng thành công",
                partTransaction.release(workOrderId, partLineId, request.quantity(), jwt));
    }
}
