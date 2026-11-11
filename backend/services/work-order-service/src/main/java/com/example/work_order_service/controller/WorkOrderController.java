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
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
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

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/work-orders")
@RequiredArgsConstructor
@Tag(name = "Work Orders", description = "Tạo, tra cứu và quản lý vòng đời Work Order.")
@SecurityRequirement(name = "bearerAuth")
@ApiResponses({
        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "400",
                description = "Request không hợp lệ (6000)",
                content = @Content(schema = @Schema(implementation = ApiResponse.class))),
        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "401",
                description = "Token thiếu hoặc không hợp lệ (1401)",
                content = @Content(schema = @Schema(implementation = ApiResponse.class))),
        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "403",
                description = "Không có quyền thực hiện thao tác (1403)",
                content = @Content(schema = @Schema(implementation = ApiResponse.class))),
        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "500",
                description = "Lỗi không xác định (9999)",
                content = @Content(schema = @Schema(implementation = ApiResponse.class)))
})
public class WorkOrderController {

    private final WorkOrderService workOrderService;
    private final EstimateService estimateService;

    @PostMapping
    @PreAuthorize("hasAuthority('WORK_ORDER_CREATE')")
    @Operation(summary = "Tạo Work Order",
            description = "Yêu cầu booking đã check-in; Work Order mới ở CREATED. Idempotent theo bookingId. "
                    + "Quyền: WORK_ORDER_CREATE. Lỗi: 400 (6000), 404 (6201/6301/6302), "
                    + "409 (6202/6203), 503 (6501).")
    @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200",
            description = "bookingId đã có Work Order; trả về Work Order hiện có")
    @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "201",
            description = "Work Order mới được tạo")
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
    @PreAuthorize("hasAuthority('ESTIMATE_CREATE')")
    @Operation(summary = "Tạo Estimate",
            description = "Tạo Estimate ở trạng thái DRAFT. INITIAL chỉ hợp lệ khi Work Order ở DIAGNOSING; "
                    + "SUPPLEMENTARY chỉ hợp lệ khi Work Order ở IN_PROGRESS. Quyền: ESTIMATE_CREATE. "
                    + "Lỗi: 400 (6000), 404 (6001), 409 (6002).")
    @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "201", description = "Estimate đã tạo")
    public ResponseEntity<ApiResponse<EstimateResponse>> createEstimate(
            @PathVariable UUID id,
            @Valid @RequestBody CreateEstimateRequest request,
            @AuthenticationPrincipal Jwt jwt
    ) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Tạo Estimate thành công", estimateService.create(id, request, jwt)));
    }

    @GetMapping("/{id}/estimates")
    @PreAuthorize("hasAuthority('ESTIMATE_READ')")
    @Operation(summary = "Liệt kê Estimate của Work Order",
            description = "Quyền: ESTIMATE_READ. Lỗi: 404 (6001).")
    public ApiResponse<List<EstimateSummaryResponse>> getEstimates(@PathVariable UUID id) {
        return ApiResponse.success(estimateService.list(id));
    }

    @PostMapping("/{id}/start-diagnosis")
    @PreAuthorize("hasAuthority('WORK_ORDER_DIAGNOSIS_START')")
    @Operation(summary = "Bắt đầu chẩn đoán",
            description = "Chỉ chuyển Work Order từ CREATED sang DIAGNOSING. Quyền: WORK_ORDER_DIAGNOSIS_START. "
                    + "Lỗi: 404 (6001), 409 (6002).")
    public ApiResponse<WorkOrderResponse> startDiagnosis(
            @PathVariable UUID id,
            @AuthenticationPrincipal Jwt jwt
    ) {
        return ApiResponse.success("Bắt đầu chẩn đoán Work Order thành công",
                workOrderService.startDiagnosis(id, jwt));
    }

    @PostMapping("/{id}/complete")
    @PreAuthorize("hasAuthority('WORK_ORDER_COMPLETE')")
    @Operation(summary = "Hoàn thành Work Order",
            description = "Chỉ hoàn thành Work Order IN_PROGRESS khi mọi service line đã COMPLETED hoặc REJECTED. "
                    + "Chuyển COMPLETED rồi PENDING_PAYMENT; phát sự kiện hoàn thành sau commit. "
                    + "Quyền: WORK_ORDER_COMPLETE. Lỗi: 404 (6001), 409 (6002).")
    public ApiResponse<WorkOrderResponse> complete(
            @PathVariable UUID id,
            @AuthenticationPrincipal Jwt jwt
    ) {
        return ApiResponse.success("Hoàn thành Work Order thành công", workOrderService.complete(id, jwt));
    }

    @PostMapping("/{id}/cancel")
    @PreAuthorize("hasAuthority('WORK_ORDER_CANCEL')")
    @Operation(summary = "Hủy Work Order",
            description = "Chỉ cho phép hủy từ CREATED, DIAGNOSING hoặc PENDING_APPROVAL; chuyển sang CANCELED. "
                    + "Reservation phụ tùng còn lại được yêu cầu giải phóng sau commit. "
                    + "Quyền: WORK_ORDER_CANCEL. Lỗi: 404 (6001), 409 (6002).")
    public ApiResponse<WorkOrderResponse> cancel(
            @PathVariable UUID id,
            @AuthenticationPrincipal Jwt jwt
    ) {
        return ApiResponse.success("Hủy Work Order thành công", workOrderService.cancel(id, jwt));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('WORK_ORDER_READ')")
    @Operation(summary = "Lấy chi tiết Work Order",
            description = "Quyền: WORK_ORDER_READ. Lỗi: 404 (6001), 503 (6501) nếu service tích hợp không khả dụng.")
    public ApiResponse<WorkOrderResponse> get(@PathVariable UUID id) {
        return ApiResponse.success(workOrderService.get(id));
    }

    @GetMapping
    @PreAuthorize("hasAuthority('WORK_ORDER_READ')")
    @Operation(summary = "Tìm kiếm Work Order",
            description = "Lọc theo trạng thái, customer, vehicle, booking, mechanic và khoảng thời gian; "
                    + "from/to dùng ISO-8601, page bắt đầu từ 0, size tối đa 100. "
                    + "Quyền: WORK_ORDER_READ. Lỗi: 400 (6000) nếu tham số không hợp lệ.")
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
