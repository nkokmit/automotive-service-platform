package com.example.work_order_service.controller;

import com.example.work_order_service.common.ApiResponse;
import com.example.work_order_service.dto.response.AdminFeedbackPageResponse;
import com.example.work_order_service.exception.ErrorCode;
import com.example.work_order_service.service.AdminFeedbackService;
import io.swagger.v3.oas.annotations.Operation;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

/**
 * API quản trị danh sách đánh giá sửa chữa.
 *
 * <p>Tách khỏi {@link WorkOrderFeedbackController} vì quyền truy cập khác hẳn:
 * đây là dữ liệu toàn cửa hàng nên chỉ tài khoản có quyền
 * {@code WORK_ORDER_FEEDBACK_READ} mới xem được, và {@code
 * WORK_ORDER_FEEDBACK_DELETE} mới được xoá.
 */
@RestController
@RequestMapping("/api/admin/work-order-feedbacks")
@RequiredArgsConstructor
public class AdminWorkOrderFeedbackController {

    private final AdminFeedbackService adminFeedbackService;

    @GetMapping
    @PreAuthorize("hasAuthority('WORK_ORDER_FEEDBACK_READ')")
    @Operation(summary = "Danh sách đánh giá sửa chữa (quản trị)",
            description = "Trả về trang đánh giá kèm điểm trung bình và phân bố theo "
                    + "mức sao. Quyền: WORK_ORDER_FEEDBACK_READ. Lỗi: 400 (6000), "
                    + "503 (6501) nếu service tích hợp không khả dụng.")
    public ApiResponse<AdminFeedbackPageResponse> list(
            @RequestParam(required = false) Integer rating,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        return ApiResponse.success(adminFeedbackService.list(rating, page, size));
    }

    @DeleteMapping("/{feedbackId}")
    @PreAuthorize("hasAuthority('WORK_ORDER_FEEDBACK_DELETE')")
    @Operation(summary = "Xoá một đánh giá (quản trị)",
            description = "Dùng khi nhận xét vi phạm. Xoá đánh giá sẽ cho phép khách "
                    + "đánh giá lại phiếu sửa chữa đó. Quyền: WORK_ORDER_FEEDBACK_DELETE. "
                    + "Lỗi: 404 (6004).")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable UUID feedbackId) {
        if (!adminFeedbackService.delete(feedbackId)) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(ApiResponse.error(ErrorCode.FEEDBACK_NOT_FOUND.getCode(),
                            ErrorCode.FEEDBACK_NOT_FOUND.getMessage()));
        }
        return ResponseEntity.status(HttpStatus.OK)
                .body(ApiResponse.success("Xoá đánh giá thành công", null));
    }
}
