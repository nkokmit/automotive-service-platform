package com.example.billing_service.dto.response;

import java.math.BigDecimal;

/**
 * Doanh thu gom theo một khoảng thời gian (ngày / tuần / tháng).
 *
 * <p>Dùng để vẽ biểu đồ xu hướng. {@code period} là nhãn đã định dạng sẵn
 * (VD: {@code "2026-11"} cho tháng, {@code "2026-11-27"} cho ngày) để frontend
 * không phải tự suy luận lại múi giờ.
 */
public record RevenuePeriodResponse(
        String period,
        BigDecimal grossRevenue,
        BigDecimal netRevenue,
        BigDecimal laborRevenue,
        BigDecimal partsRevenue,
        long invoiceCount
) {
    public RevenuePeriodResponse {
        grossRevenue = scale(grossRevenue);
        netRevenue = scale(netRevenue);
        laborRevenue = scale(laborRevenue);
        partsRevenue = scale(partsRevenue);
    }

    private static BigDecimal scale(BigDecimal value) {
        return value == null ? BigDecimal.ZERO : value;
    }
}
