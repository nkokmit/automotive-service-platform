package com.example.billing_service.controller;

import com.example.billing_service.common.ApiResponse;
import com.example.billing_service.dto.response.PaymentBreakdownResponse;
import com.example.billing_service.dto.response.RevenueByCategoryResponse;
import com.example.billing_service.dto.response.RevenueByItemResponse;
import com.example.billing_service.dto.response.RevenueOverviewResponse;
import com.example.billing_service.dto.response.RevenuePeriodResponse;
import com.example.billing_service.enums.InvoiceItemType;
import com.example.billing_service.exception.ApiException;
import com.example.billing_service.exception.ErrorCode;
import com.example.billing_service.service.ReportGranularity;
import com.example.billing_service.service.ReportService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;

/**
 * API báo cáo & thống kê doanh thu.
 *
 * <p>Khoảng thời gian lọc luôn là <b>[from, to)</b> — nếu client không truyền
 * {@code to}, mặc định lấy "đến hết ngày hôm nay".
 */
@RestController
@RequestMapping("/api/reports")
@Validated
@RequiredArgsConstructor
@Tag(name = "Reports", description = "Báo cáo & thống kê doanh thu.")
@SecurityRequirement(name = "bearerAuth")
public class ReportController {

    private final ReportService reportService;

    @GetMapping("/revenue/overview")
    @PreAuthorize("hasAuthority('REPORT_READ')")
    @Operation(summary = "Tổng quan doanh thu trong kỳ",
            description = "Trả về doanh thu gross/net, đã thu, công nợ, giá trị đơn trung bình "
                    + "và tỉ lệ công lao động - phụ tùng.")
    public ApiResponse<RevenueOverviewResponse> overview(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant to
    ) {
        Instant[] range = resolveRange(from, to);
        return ApiResponse.success(reportService.overview(range[0], range[1]));
    }

    @GetMapping("/revenue/by-period")
    @PreAuthorize("hasAuthority('REPORT_READ')")
    @Operation(summary = "Doanh thu theo kỳ (ngày / tuần / tháng / năm)",
            description = "Dùng để vẽ biểu đồ xu hướng.")
    public ApiResponse<List<RevenuePeriodResponse>> revenueByPeriod(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant to,
            @RequestParam(defaultValue = "MONTH") ReportGranularity granularity
    ) {
        Instant[] range = resolveRange(from, to);
        return ApiResponse.success(reportService.revenueByPeriod(range[0], range[1], granularity));
    }

    @GetMapping("/revenue/by-service")
    @PreAuthorize("hasAuthority('REPORT_READ')")
    @Operation(summary = "Doanh thu theo dịch vụ / phụ tùng",
            description = "itemType: SERVICE (dịch vụ), PART (phụ tùng) hoặc bỏ trống để lấy tất cả.")
    public ApiResponse<List<RevenueByItemResponse>> revenueByService(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant to,
            @RequestParam(required = false) InvoiceItemType itemType
    ) {
        Instant[] range = resolveRange(from, to);
        return ApiResponse.success(reportService.revenueByItem(range[0], range[1], itemType));
    }

    @GetMapping("/revenue/by-category")
    @PreAuthorize("hasAuthority('REPORT_READ')")
    @Operation(summary = "Doanh thu theo nhóm dịch vụ",
            description = "Nhóm dịch vụ lấy từ inventory-service; phụ tùng gom vào nhóm riêng.")
    public ApiResponse<List<RevenueByCategoryResponse>> revenueByCategory(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant to
    ) {
        Instant[] range = resolveRange(from, to);
        return ApiResponse.success(reportService.revenueByCategory(range[0], range[1]));
    }

    @GetMapping("/payments/breakdown")
    @PreAuthorize("hasAuthority('REPORT_READ')")
    @Operation(summary = "Phân bổ thanh toán theo phương thức",
            description = "Tiền mặt / chuyển khoản / thẻ, kèm phần đã hoàn.")
    public ApiResponse<List<PaymentBreakdownResponse>> paymentBreakdown(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant to
    ) {
        Instant[] range = resolveRange(from, to);
        return ApiResponse.success(reportService.paymentBreakdown(range[0], range[1]));
    }

    /**
     * Chuẩn hóa khoảng lọc về dạng {@code [from, to)}.
     *
     * <p>Mặc định: từ đầu tháng hiện tại đến hết ngày mai (để "tháng này" luôn
     * bao gồm cả ngày đang chạy).
     *
     * <p>Múi giờ cố định {@code Asia/Ho_Chi_Minh} — khớp với múi giờ MySQL và
     * với cách frontend hiển thị ngày, nên "tháng này" không bị lệch ngày.
     */
    private Instant[] resolveRange(Instant from, Instant to) {
        ZoneId zone = ZoneId.of("Asia/Ho_Chi_Minh");
        LocalDate today = LocalDate.now(zone);

        Instant start = from != null
                ? from
                : today.withDayOfMonth(1).atStartOfDay(zone).toInstant();
        Instant end = to != null
                ? to
                : today.plusDays(1).atStartOfDay(zone).toInstant();

        if (start.isAfter(end)) {
            throw new ApiException(ErrorCode.INVALID_REQUEST, "from phải nhỏ hơn hoặc bằng to");
        }
        return new Instant[]{start, end};
    }
}
