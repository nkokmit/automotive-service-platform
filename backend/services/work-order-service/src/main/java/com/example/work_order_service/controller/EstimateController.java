package com.example.work_order_service.controller;

import com.example.work_order_service.common.ApiResponse;
import com.example.work_order_service.dto.request.AddPartToEstimateRequest;
import com.example.work_order_service.dto.request.AddServiceToEstimateRequest;
import com.example.work_order_service.dto.request.EstimateDecisionRequest;
import com.example.work_order_service.dto.response.EstimateResponse;
import com.example.work_order_service.service.EstimateService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/api/estimates")
@RequiredArgsConstructor
@Tag(name = "Estimates", description = "Tạo, chỉnh sửa, gửi duyệt và ghi nhận quyết định Estimate.")
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
public class EstimateController {

    private final EstimateService estimateService;

    @GetMapping("/{estimateId}")
    @PreAuthorize("hasAuthority('ESTIMATE_READ')")
    @Operation(summary = "Lấy chi tiết Estimate", description = "Quyền: ESTIMATE_READ. Lỗi: 404 (6101).")
    public ApiResponse<EstimateResponse> get(@PathVariable UUID estimateId) {
        return ApiResponse.success(estimateService.get(estimateId));
    }

    @PostMapping("/{estimateId}/services")
    @PreAuthorize("hasAuthority('ESTIMATE_UPDATE')")
    @Operation(summary = "Thêm dịch vụ vào Estimate",
            description = "Chỉ thêm vào Estimate DRAFT; giá và thông tin dịch vụ được snapshot. "
                    + "Quyền: ESTIMATE_UPDATE. Lỗi: 400 (6000), 404 (6101/6401), 409 (6102/6402/6403), "
                    + "503 (6501).")
    @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "201", description = "Đã thêm service line")
    public ResponseEntity<ApiResponse<EstimateResponse>> addService(
            @PathVariable UUID estimateId,
            @Valid @RequestBody AddServiceToEstimateRequest request
    ) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Thêm dịch vụ vào Estimate thành công",
                        estimateService.addService(estimateId, request)));
    }

    @DeleteMapping("/{estimateId}/services/{serviceLineId}")
    @PreAuthorize("hasAuthority('ESTIMATE_UPDATE')")
    @Operation(summary = "Xóa service line",
            description = "Chỉ xóa khi Estimate ở DRAFT hoặc PENDING_APPROVAL. "
                    + "Quyền: ESTIMATE_UPDATE. Lỗi: 404 (6101/6103), 409 (6102).")
    @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "204", description = "Đã xóa")
    public ResponseEntity<Void> removeService(
            @PathVariable UUID estimateId,
            @PathVariable UUID serviceLineId
    ) {
        estimateService.removeService(estimateId, serviceLineId);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{estimateId}/parts")
    @PreAuthorize("hasAuthority('ESTIMATE_UPDATE')")
    @Operation(summary = "Thêm phụ tùng vào Estimate",
            description = "Chỉ thêm vào Estimate DRAFT; part line được snapshot theo catalog hiện tại. "
                    + "Quyền: ESTIMATE_UPDATE. Lỗi: 400 (6000), 404 (6101/6404), 409 (6102/6405), "
                    + "503 (6501).")
    @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "201", description = "Đã thêm part line")
    public ResponseEntity<ApiResponse<EstimateResponse>> addPart(
            @PathVariable UUID estimateId,
            @Valid @RequestBody AddPartToEstimateRequest request
    ) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Thêm phụ tùng vào Estimate thành công",
                        estimateService.addPart(estimateId, request)));
    }

    @DeleteMapping("/{estimateId}/parts/{partLineId}")
    @PreAuthorize("hasAuthority('ESTIMATE_UPDATE')")
    @Operation(summary = "Xóa part line",
            description = "Chỉ xóa khi Estimate ở DRAFT hoặc PENDING_APPROVAL. "
                    + "Quyền: ESTIMATE_UPDATE. Lỗi: 404 (6101/6104), 409 (6102).")
    @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "204", description = "Đã xóa")
    public ResponseEntity<Void> removePart(
            @PathVariable UUID estimateId,
            @PathVariable UUID partLineId
    ) {
        estimateService.removePart(estimateId, partLineId);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{estimateId}/submit")
    @PreAuthorize("hasAuthority('ESTIMATE_SUBMIT')")
    @Operation(summary = "Gửi Estimate để duyệt",
            description = "Estimate DRAFT chuyển sang PENDING_APPROVAL. Estimate INITIAL đưa Work Order "
                    + "DIAGNOSING sang PENDING_APPROVAL; Estimate SUPPLEMENTARY giữ Work Order IN_PROGRESS. "
                    + "Quyền: ESTIMATE_SUBMIT. Lỗi: 404 (6101), 409 (6102/6002).")
    public ApiResponse<EstimateResponse> submit(
            @PathVariable UUID estimateId,
            @AuthenticationPrincipal Jwt jwt
    ) {
        return ApiResponse.success("Gửi Estimate chờ khách duyệt thành công",
                estimateService.submit(estimateId, jwt));
    }

    @PatchMapping("/{estimateId}/decision")
    @PreAuthorize("hasAuthority('ESTIMATE_DECISION_RECORD')")
    @Operation(summary = "Ghi nhận quyết định Estimate",
            description = "Khi tất cả item đã được quyết định, Estimate chuyển PENDING_APPROVAL sang "
                    + "APPROVED, PARTIALLY_APPROVED hoặc REJECTED. Initial Estimate bị từ chối sẽ hủy Work Order; "
                    + "Initial Estimate được duyệt không cần giữ chỗ phụ tùng sẽ đưa Work Order vào IN_PROGRESS. "
                    + "Nếu cần phụ tùng, Work Order chờ kết quả reservation; quyết định Supplementary Estimate "
                    + "không đổi trạng thái Work Order. Quyền: ESTIMATE_DECISION_RECORD. "
                    + "Lỗi: 400 (6000), 404 (6101/6103/6104), 409 (6002/6102/6105).")
    public ApiResponse<EstimateResponse> decide(
            @PathVariable UUID estimateId,
            @Valid @RequestBody EstimateDecisionRequest request,
            @AuthenticationPrincipal Jwt jwt
    ) {
        return ApiResponse.success("Cập nhật quyết định Estimate thành công",
                estimateService.decide(estimateId, request, jwt));
    }
}
