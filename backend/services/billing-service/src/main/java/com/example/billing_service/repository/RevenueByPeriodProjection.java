package com.example.billing_service.repository;

import java.math.BigDecimal;

/**
 * Doanh thu gom theo kỳ (ngày / tuần / tháng).
 *
 * <p>{@code period} được tính ngay trong SQL để frontend không phải tự gom
 * nhóm — tránh lệch múi giờ giữa server và client.
 */
public interface RevenueByPeriodProjection {

    /** Nhãn kỳ đã định dạng: {@code "2026-11"} / {@code "2026-11-27"} / {@code "2026-W48"}. */
    String getPeriod();

    BigDecimal getGrossRevenue();

    BigDecimal getNetRevenue();

    BigDecimal getLaborRevenue();

    BigDecimal getPartsRevenue();

    Long getInvoiceCount();
}
