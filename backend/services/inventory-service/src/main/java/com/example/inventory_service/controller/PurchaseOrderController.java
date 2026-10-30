package com.example.inventory_service.controller;

import com.example.inventory_service.common.ApiResponse;
import com.example.inventory_service.common.PageResponse;
import com.example.inventory_service.common.PageableFactory;
import com.example.inventory_service.dto.request.PurchaseOrderRequest;
import com.example.inventory_service.dto.response.PurchaseOrderResponse;
import com.example.inventory_service.enums.PurchaseOrderStatus;
import com.example.inventory_service.service.PurchaseOrderService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
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
@Tag(name = "Đơn nhập hàng", description = "Đơn nhập hàng và nhập kho, tính lại giá vốn bình quân")
public class PurchaseOrderController {

    private static final Set<String> SORT_FIELDS = Set.of("code", "status", "totalAmount", "createdAt");

    private final PurchaseOrderService purchaseOrderService;

    @GetMapping
    @PreAuthorize("hasAuthority('PURCHASE_ORDER_READ')")
    @Operation(summary = "Danh sách đơn nhập hàng",
            description = "Phân trang và lọc theo keyword, trạng thái hoặc nhà cung cấp.")
    @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200",
            description = "Trả về một trang kết quả đơn nhập hàng.")
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
    @Operation(summary = "Chi tiết đơn nhập hàng")
    @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200",
            description = "Trả về chi tiết đơn nhập hàng kèm các dòng hàng.")
    @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "400",
            description = "Không tìm thấy đơn nhập hàng.")
    public ApiResponse<PurchaseOrderResponse> getPurchaseOrder(@PathVariable UUID purchaseOrderId) {
        return ApiResponse.success(purchaseOrderService.getPurchaseOrderById(purchaseOrderId));
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAuthority('PURCHASE_ORDER_WRITE')")
    @Operation(summary = "Tạo đơn nhập hàng",
            description = "Tạo đơn ở trạng thái DRAFT. Danh sách mặt hàng thay thế toàn bộ dòng hàng cũ.")
    @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "201",
            description = "Đơn nhập hàng đã được tạo.")
    @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "400",
            description = "Mã đơn đã tồn tại, nhà cung cấp không hợp lệ hoặc có phụ tùng lặp.")
    public ApiResponse<PurchaseOrderResponse> createPurchaseOrder(
            @Valid @RequestBody PurchaseOrderRequest request) {
        return ApiResponse.success("Tạo đơn nhập hàng thành công",
                purchaseOrderService.createPurchaseOrder(request));
    }

    @PutMapping("/{purchaseOrderId}")
    @PreAuthorize("hasAuthority('PURCHASE_ORDER_WRITE')")
    @Operation(summary = "Cập nhật đơn nhập hàng",
            description = "Chỉ cập nhật được khi đơn đang ở trạng thái DRAFT.")
    @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200",
            description = "Đơn nhập hàng đã được cập nhật.")
    @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "400",
            description = "Trạng thái đơn không cho phép sửa, hoặc dữ liệu không hợp lệ.")
    public ApiResponse<PurchaseOrderResponse> updatePurchaseOrder(@PathVariable UUID purchaseOrderId,
                                                                  @Valid @RequestBody PurchaseOrderRequest request) {
        return ApiResponse.success("Cập nhật đơn nhập hàng thành công",
                purchaseOrderService.updatePurchaseOrder(purchaseOrderId, request));
    }

    @PostMapping("/{purchaseOrderId}/approve")
    @PreAuthorize("hasAuthority('PURCHASE_ORDER_WRITE')")
    @Operation(summary = "Duyệt đơn nhập hàng",
            description = "Chuyển đơn từ DRAFT sang APPROVED.")
    @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200",
            description = "Đơn nhập hàng đã được duyệt.")
    @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "400",
            description = "Trạng thái đơn không cho phép duyệt hoặc đơn chưa có mặt hàng.")
    public ApiResponse<PurchaseOrderResponse> approve(@PathVariable UUID purchaseOrderId) {
        return ApiResponse.success("Duyệt đơn nhập hàng thành công", purchaseOrderService.approve(purchaseOrderId));
    }

    @PostMapping("/{purchaseOrderId}/complete")
    @PreAuthorize("hasAuthority('PURCHASE_ORDER_WRITE')")
    @Operation(summary = "Hoàn tất nhập kho",
            description = "Chuyển đơn từ APPROVED sang RECEIVED: tăng tồn thực, tính lại giá vốn "
                    + "bình quân tức thời và ghi sổ kho IMPORT. Toàn bộ thao tác trong một transaction.")
    @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200",
            description = "Đơn nhập hàng đã được nhập kho.")
    @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "400",
            description = "Trạng thái đơn không cho phép nhập kho hoặc đơn chưa có mặt hàng.")
    public ApiResponse<PurchaseOrderResponse> complete(@PathVariable UUID purchaseOrderId) {
        return ApiResponse.success("Nhập kho thành công", purchaseOrderService.complete(purchaseOrderId));
    }

    @PostMapping("/{purchaseOrderId}/cancel")
    @PreAuthorize("hasAuthority('PURCHASE_ORDER_WRITE')")
    @Operation(summary = "Hủy đơn nhập hàng",
            description = "Hủy đơn ở trạng thái DRAFT hoặc APPROVED. Đơn đã nhập kho thì không hủy được.")
    @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200",
            description = "Đơn nhập hàng đã bị hủy.")
    @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "400",
            description = "Trạng thái đơn không cho phép hủy.")
    public ApiResponse<PurchaseOrderResponse> cancel(@PathVariable UUID purchaseOrderId) {
        return ApiResponse.success("Hủy đơn nhập hàng thành công", purchaseOrderService.cancel(purchaseOrderId));
    }
}
