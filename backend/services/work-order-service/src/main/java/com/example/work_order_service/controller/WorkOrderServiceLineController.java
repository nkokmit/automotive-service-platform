package com.example.work_order_service.controller;

import com.example.work_order_service.common.ApiResponse;
import com.example.work_order_service.dto.request.AssignMechanicRequest;
import com.example.work_order_service.dto.response.AssignedServiceLineResponse;
import com.example.work_order_service.enums.WorkOrderServiceStatus;
import com.example.work_order_service.service.WorkOrderServiceLineService;
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
@Tag(name = "Work Order Service Lines", description = "Phân công và cập nhật tiến độ service line.")
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
public class WorkOrderServiceLineController {

    private final WorkOrderServiceLineService service;

    @PatchMapping("/api/work-order-service-lines/{serviceLineId}/assign")
    @PreAuthorize("hasAuthority('SERVICE_LINE_ASSIGN')")
    @Operation(summary = "Phân công mechanic",
            description = "Phân công hồ sơ nhân viên đang hoạt động cho service line APPROVED của Work Order "
                    + "IN_PROGRESS. Quyền: SERVICE_LINE_ASSIGN. Lỗi: 400 (6000), 404 (6103/6107), "
                    + "409 (6106/6108).")
    public ApiResponse<AssignedServiceLineResponse> assign(
            @PathVariable UUID serviceLineId,
            @Valid @RequestBody AssignMechanicRequest request
    ) {
        return ApiResponse.success("Phân công mechanic thành công",
                service.assign(serviceLineId, request));
    }

    @GetMapping("/api/work-order-service-lines/me")
    @PreAuthorize("hasAuthority('SERVICE_LINE_READ_ASSIGNED')")
    @Operation(summary = "Liệt kê service line được giao cho tôi",
            description = "Tài khoản mechanic chỉ đọc service line được giao cho chính mình; status là bộ lọc tùy chọn. "
                    + "Quyền: SERVICE_LINE_READ_ASSIGNED.")
    public ApiResponse<List<AssignedServiceLineResponse>> getMyLines(
            @RequestParam(required = false) WorkOrderServiceStatus status,
            @AuthenticationPrincipal Jwt jwt
    ) {
        return ApiResponse.success(service.getMyLines(status, jwt));
    }

    @PostMapping("/api/work-order-service-lines/{serviceLineId}/start")
    @PreAuthorize("hasAuthority('SERVICE_LINE_START')")
    @Operation(summary = "Bắt đầu service line",
            description = "Chỉ mechanic được giao mới được chuyển service line APPROVED sang IN_PROGRESS. "
                    + "Quyền: SERVICE_LINE_START. Lỗi: 404 (6103), 409 (6106).")
    public ApiResponse<AssignedServiceLineResponse> start(
            @PathVariable UUID serviceLineId,
            @AuthenticationPrincipal Jwt jwt
    ) {
        return ApiResponse.success(service.start(serviceLineId, jwt));
    }

    @PostMapping("/api/work-order-service-lines/{serviceLineId}/complete")
    @PreAuthorize("hasAuthority('SERVICE_LINE_COMPLETE')")
    @Operation(summary = "Hoàn thành service line",
            description = "Chỉ mechanic được giao mới được chuyển service line IN_PROGRESS sang COMPLETED; "
                    + "ghi completedAt khi hoàn tất. Quyền: SERVICE_LINE_COMPLETE. "
                    + "Lỗi: 404 (6103), 409 (6106).")
    public ApiResponse<AssignedServiceLineResponse> complete(
            @PathVariable UUID serviceLineId,
            @AuthenticationPrincipal Jwt jwt
    ) {
        return ApiResponse.success(service.complete(serviceLineId, jwt));
    }
}
