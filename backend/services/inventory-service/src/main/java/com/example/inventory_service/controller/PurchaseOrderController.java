package com.example.inventory_service.controller;

import com.example.inventory_service.common.ApiResponse;
import com.example.inventory_service.common.PageResponse;
import com.example.inventory_service.common.PageableFactory;
import com.example.inventory_service.dto.request.PurchaseOrderRequest;
import com.example.inventory_service.dto.response.PurchaseOrderResponse;
import com.example.inventory_service.enums.PurchaseOrderStatus;
import com.example.inventory_service.service.PurchaseOrderService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.Set;
import java.util.UUID;

@RestController
@RequestMapping("/api/purchase-orders")
@RequiredArgsConstructor
@Validated
public class PurchaseOrderController {

    private static final Set<String> SORT_FIELDS = Set.of("code", "status", "totalAmount", "createdAt");

    private final PurchaseOrderService purchaseOrderService;

    @GetMapping
    @PreAuthorize("hasAuthority('PURCHASE_ORDER_READ')")
    public ApiResponse<PageResponse<PurchaseOrderResponse>> getPurchaseOrders(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) PurchaseOrderStatus status,
            @RequestParam(required = false) UUID supplierId,
            @RequestParam(defaultValue = "0") @Min(0) int page,
            @RequestParam(defaultValue = "20") @Min(1) @Max(100) int size,
            @RequestParam(defaultValue = "createdAt") String sortBy,
            @RequestParam(defaultValue = "DESC") String sortDirection
    ) {
        return ApiResponse.success(purchaseOrderService.getPurchaseOrders(keyword, status, supplierId,
                PageableFactory.of(page, size, sortBy, sortDirection, SORT_FIELDS, "createdAt")));
    }

    @GetMapping("/{purchaseOrderId}")
    @PreAuthorize("hasAuthority('PURCHASE_ORDER_READ')")
    public ApiResponse<PurchaseOrderResponse> getPurchaseOrder(@PathVariable UUID purchaseOrderId) {
        return ApiResponse.success(purchaseOrderService.getPurchaseOrderById(purchaseOrderId));
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAuthority('PURCHASE_ORDER_WRITE')")
    public ApiResponse<PurchaseOrderResponse> createPurchaseOrder(
            @Valid @RequestBody PurchaseOrderRequest request) {
        return ApiResponse.success("Tạo đơn nhập hàng thành công",
                purchaseOrderService.createPurchaseOrder(request));
    }

    @PutMapping("/{purchaseOrderId}")
    @PreAuthorize("hasAuthority('PURCHASE_ORDER_WRITE')")
    public ApiResponse<PurchaseOrderResponse> updatePurchaseOrder(
            @PathVariable UUID purchaseOrderId,
            @Valid @RequestBody PurchaseOrderRequest request) {
        return ApiResponse.success("Cập nhật đơn nhập hàng thành công",
                purchaseOrderService.updatePurchaseOrder(purchaseOrderId, request));
    }

    @PostMapping("/{purchaseOrderId}/approve")
    @PreAuthorize("hasAuthority('PURCHASE_ORDER_WRITE')")
    public ApiResponse<PurchaseOrderResponse> approve(@PathVariable UUID purchaseOrderId) {
        return ApiResponse.success("Duyệt đơn nhập hàng thành công", purchaseOrderService.approve(purchaseOrderId));
    }

    @PostMapping("/{purchaseOrderId}/complete")
    @PreAuthorize("hasAuthority('PURCHASE_ORDER_WRITE')")
    public ApiResponse<PurchaseOrderResponse> complete(@PathVariable UUID purchaseOrderId) {
        return ApiResponse.success("Nhập kho thành công", purchaseOrderService.complete(purchaseOrderId));
    }

    @PostMapping("/{purchaseOrderId}/cancel")
    @PreAuthorize("hasAuthority('PURCHASE_ORDER_WRITE')")
    public ApiResponse<PurchaseOrderResponse> cancel(@PathVariable UUID purchaseOrderId) {
        return ApiResponse.success("Hủy đơn nhập hàng thành công", purchaseOrderService.cancel(purchaseOrderId));
    }
}
