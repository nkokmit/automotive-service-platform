package com.example.billing_service.controller;

import com.example.billing_service.common.ApiResponse;
import com.example.billing_service.dto.request.DiscountUpdateRequest;
import com.example.billing_service.dto.request.InvoiceVoidRequest;
import com.example.billing_service.dto.response.InvoicePageResponse;
import com.example.billing_service.dto.response.InvoiceResponse;
import com.example.billing_service.enums.InvoiceStatus;
import com.example.billing_service.service.InvoiceService;
import com.example.billing_service.security.JwtUserIdResolver;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.UUID;

@RestController
@RequestMapping("/api/invoices")
@Validated
@RequiredArgsConstructor
@Tag(name = "Invoices", description = "Tạo, tra cứu và quản lý hóa đơn.")
@SecurityRequirement(name = "bearerAuth")
public class InvoiceController {

    private final InvoiceService invoiceService;

    @PostMapping("/from-work-order/{workOrderId}")
    @PreAuthorize("hasAuthority('INVOICE_WRITE')")
    @Operation(summary = "Tạo hóa đơn từ Work Order",
            description = "Chỉ tính dịch vụ đã hoàn thành và số phụ tùng thực tế đã xuất.")
    public ApiResponse<InvoiceResponse> createFromWorkOrder(
            @PathVariable UUID workOrderId,
            @AuthenticationPrincipal Jwt jwt
    ) {
        return ApiResponse.success("Tạo hóa đơn thành công",
                invoiceService.createFromWorkOrder(workOrderId, userId(jwt)));
    }

    @GetMapping
    @PreAuthorize("hasAuthority('INVOICE_READ')")
    @Operation(summary = "Tìm kiếm hóa đơn", description = "Lọc theo trạng thái, khách hàng, ngày phát hành; có phân trang.")
    public ApiResponse<InvoicePageResponse> search(
            @RequestParam(required = false) InvoiceStatus status,
            @RequestParam(required = false) UUID customerId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant to,
            @RequestParam(defaultValue = "0") @Min(0) int page,
            @RequestParam(defaultValue = "20") @Min(1) @Max(100) int size
    ) {
        return ApiResponse.success(invoiceService.search(status, customerId, from, to, page, size));
    }

    @GetMapping("/me")
    @PreAuthorize("hasAuthority('INVOICE_READ')")
    @Operation(summary = "Lịch sử hóa đơn của khách hàng hiện tại")
    public ApiResponse<InvoicePageResponse> getMine(
            @AuthenticationPrincipal Jwt jwt,
            @RequestParam(defaultValue = "0") @Min(0) int page,
            @RequestParam(defaultValue = "20") @Min(1) @Max(100) int size
    ) {
        return ApiResponse.success(invoiceService.getMine(userId(jwt), page, size));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('INVOICE_READ')")
    @Operation(summary = "Chi tiết hóa đơn", description = "Bao gồm các dòng hóa đơn và lịch sử thanh toán.")
    public ApiResponse<InvoiceResponse> get(@PathVariable UUID id) {
        return ApiResponse.success(invoiceService.get(id));
    }

    @PatchMapping("/{id}/discount")
    @PreAuthorize("hasAuthority('INVOICE_WRITE')")
    @Operation(summary = "Cập nhật chiết khấu", description = "Chỉ áp dụng khi hóa đơn chưa được thanh toán.")
    public ApiResponse<InvoiceResponse> updateDiscount(
            @PathVariable UUID id,
            @Valid @RequestBody DiscountUpdateRequest request
    ) {
        return ApiResponse.success("Cập nhật chiết khấu thành công",
                invoiceService.updateDiscount(id, request.discountAmount(), request.note()));
    }

    @PostMapping("/{id}/void")
    @PreAuthorize("hasAuthority('INVOICE_WRITE')")
    @Operation(summary = "Hủy hóa đơn", description = "Chỉ hủy hóa đơn chưa nhận thanh toán.")
    public ApiResponse<InvoiceResponse> voidInvoice(
            @PathVariable UUID id,
            @RequestBody(required = false) InvoiceVoidRequest request
    ) {
        return ApiResponse.success("Hủy hóa đơn thành công",
                invoiceService.voidInvoice(id, request == null ? null : request.reason()));
    }

    private UUID userId(Jwt jwt) {
        return JwtUserIdResolver.resolveUserId(jwt);
    }
}
