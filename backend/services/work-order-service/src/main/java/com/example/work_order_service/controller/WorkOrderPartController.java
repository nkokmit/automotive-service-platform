package com.example.work_order_service.controller;

import com.example.work_order_service.common.ApiResponse;
import com.example.work_order_service.dto.request.PartQuantityRequest;
import com.example.work_order_service.dto.response.WorkOrderPartLineResponse;
import com.example.work_order_service.service.WorkOrderPartTransaction;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
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
@RequestMapping("/api/work-orders/{workOrderId}/parts/{partLineId}")
@RequiredArgsConstructor
@Tag(name = "Work Order Parts", description = "Xuất và giải phóng reservation phụ tùng cho Work Order.")
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
public class WorkOrderPartController {

    private final WorkOrderPartTransaction partTransaction;

    @PostMapping("/issue")
    @PreAuthorize("hasAuthority('PART_ISSUE')")
    @Operation(summary = "Xuất phụ tùng",
            description = "Xuất số lượng dương từ reservation của part line; tồn kho do Inventory Service quản lý. "
                    + "Quyền: PART_ISSUE. Lỗi: 400 (6000), 404 (6001/6104), 409 (6002/6406), 503 (6501).")
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
    @PreAuthorize("hasAuthority('PART_RELEASE')")
    @Operation(summary = "Giải phóng reservation phụ tùng",
            description = "Giải phóng số lượng dương còn reservation; tồn kho do Inventory Service quản lý. "
                    + "Quyền: PART_RELEASE. Lỗi: 400 (6000), 404 (6001/6104), 409 (6002/6406), 503 (6501).")
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
