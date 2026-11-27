package com.example.billing_service.repository;

import java.math.BigDecimal;

/**
 * Tổng hợp số tiền theo hóa đơn — dùng cho báo cáo doanh thu.
 *
 * <p>Các field trả về có thể {@code null} khi không có bản ghi khớp bộ lọc —
 * service luôn chuẩn hóa về 0 trước khi tính toán.
 */
public interface RevenueSummaryProjection {

    /** Tổng tiền công lao động. */
    BigDecimal getTotalLabor();

    /** Tổng tiền phụ tùng. */
    BigDecimal getTotalParts();

    /** Tổng chiết khấu. */
    BigDecimal getTotalDiscount();

    /** Tổng thuế. */
    BigDecimal getTotalTax();

    /** Tổng doanh thu thuần (= tổng grand_total). */
    BigDecimal getNetRevenue();

    /** Số hóa đơn đã phát hành (không tính VOID). */
    Long getInvoiceCount();

    /** Số hóa đơn bị hủy. */
    Long getVoidedInvoiceCount();

    /** Tổng tiền đã thu (net). */
    BigDecimal getPaidAmount();
}
