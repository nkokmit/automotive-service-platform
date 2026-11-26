package com.example.work_order_service.controller;

import com.example.work_order_service.common.ApiResponse;
import com.example.work_order_service.dto.request.CreateWorkOrderFeedbackRequest;
import com.example.work_order_service.dto.response.FeedbackEligiblePageResponse;
import com.example.work_order_service.dto.response.HomepageReviewSummaryResponse;
import com.example.work_order_service.dto.response.WorkOrderFeedbackResponse;
import com.example.work_order_service.service.WorkOrderFeedbackService;
import io.swagger.v3.oas.annotations.Operation;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/api/work-orders")
@RequiredArgsConstructor
public class WorkOrderFeedbackController {

    private final WorkOrderFeedbackService feedbackService;

    @GetMapping("/me/feedback-eligible")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Liệt kê Work Order tôi có thể đánh giá",
            description = "Chỉ trả Work Order đã CLOSED của khách hiện tại chưa được đánh giá.")
    public ApiResponse<FeedbackEligiblePageResponse> getEligibleWorkOrders(
            @AuthenticationPrincipal Jwt jwt,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        return ApiResponse.success(feedbackService.getEligibleWorkOrders(jwt, page, size));
    }

    @PostMapping("/{workOrderId}/feedback")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Gửi đánh giá cho Work Order đã đóng")
    public ResponseEntity<ApiResponse<WorkOrderFeedbackResponse>> submit(
            @PathVariable UUID workOrderId,
            @Valid @RequestBody CreateWorkOrderFeedbackRequest request,
            @AuthenticationPrincipal Jwt jwt
    ) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Gửi đánh giá thành công",
                        feedbackService.submit(workOrderId, request, jwt)));
    }

    @GetMapping("/reviews/summary")
    @PreAuthorize("permitAll()")
    @Operation(summary = "Tổng hợp đánh giá công khai cho trang chủ")
    public ApiResponse<HomepageReviewSummaryResponse> getHomepageSummary(
            @RequestParam(defaultValue = "5") int limit
    ) {
        return ApiResponse.success(feedbackService.getHomepageSummary(limit));
    }
}
