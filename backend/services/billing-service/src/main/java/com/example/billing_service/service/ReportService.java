package com.example.billing_service.service;

import com.example.billing_service.dto.response.PaymentBreakdownResponse;
import com.example.billing_service.dto.response.RevenueByCategoryResponse;
import com.example.billing_service.dto.response.RevenueByItemResponse;
import com.example.billing_service.dto.response.RevenueOverviewResponse;
import com.example.billing_service.dto.response.RevenuePeriodResponse;
import com.example.billing_service.enums.InvoiceItemType;

import java.time.Instant;
import java.util.List;

/**
 * Module báo cáo & thống kê doanh thu.
 *
 * <p>Toàn bộ số liệu lấy từ database {@code billing_service} (hóa đơn + dòng hóa
 * đơn + thanh toán) — cùng một database nên tổng hợp bằng một câu SQL, không
 * cần gọi service khác.
 *
 * <p>Riêng báo cáo "theo nhóm dịch vụ" cần biết nhóm của từng dịch vụ — nhóm
 * thuộc {@code inventory-service} nên phải gọi API nội bộ của service đó.
 */
public interface ReportService {

    /** Tổng quan doanh thu trong kỳ {@code [from, to)}. */
    RevenueOverviewResponse overview(Instant from, Instant to);

    /** Doanh thu gom theo kỳ (ngày / tuần / tháng) để vẽ biểu đồ xu hướng. */
    List<RevenuePeriodResponse> revenueByPeriod(Instant from, Instant to, ReportGranularity granularity);

    /** Doanh thu gom theo dịch vụ / phụ tùng. */
    List<RevenueByItemResponse> revenueByItem(Instant from, Instant to, InvoiceItemType itemType);

    /** Doanh thu gom theo nhóm dịch vụ. */
    List<RevenueByCategoryResponse> revenueByCategory(Instant from, Instant to);

    /** Thanh toán gom theo phương thức. */
    List<PaymentBreakdownResponse> paymentBreakdown(Instant from, Instant to);
}
