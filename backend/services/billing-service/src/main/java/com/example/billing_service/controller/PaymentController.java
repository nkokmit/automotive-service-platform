package com.example.billing_service.controller;

import com.example.billing_service.common.ApiResponse;
import com.example.billing_service.dto.request.PaymentCreateRequest;
import com.example.billing_service.dto.request.PaymentRefundRequest;
import com.example.billing_service.dto.response.PaymentResponse;
import com.example.billing_service.service.PaymentService;
import com.example.billing_service.security.JwtUserIdResolver;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/api/payments")
@RequiredArgsConstructor
@Tag(name = "Payments", description = "Ghi nhận thanh toán tại quầy và hoàn tiền.")
@SecurityRequirement(name = "bearerAuth")
public class PaymentController {

    private final PaymentService paymentService;

    @PostMapping
    @PreAuthorize("hasAuthority('PAYMENT_WRITE')")
    @Operation(summary = "Ghi nhận thanh toán", description = "Idempotent theo idempotencyKey.")
    public ApiResponse<PaymentResponse> record(
            @Valid @RequestBody PaymentCreateRequest request,
            @AuthenticationPrincipal Jwt jwt
    ) {
        return ApiResponse.success(paymentService.record(request, JwtUserIdResolver.resolveUserId(jwt)));
    }

    @PostMapping("/{id}/refund")
    @PreAuthorize("hasAuthority('PAYMENT_REFUND')")
    @Operation(summary = "Hoàn tiền thanh toán", description = "Hoàn toàn bộ một giao dịch đã thành công.")
    public ApiResponse<PaymentResponse> refund(
            @PathVariable UUID id,
            @RequestBody(required = false) PaymentRefundRequest request
    ) {
        return ApiResponse.success(paymentService.refund(id, request == null ? null : request.reason()));
    }
}
