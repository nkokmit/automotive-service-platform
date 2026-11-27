package com.example.billing_service.dto.response;

import com.example.billing_service.enums.InvoiceItemType;

import java.math.BigDecimal;
import java.util.UUID;

/**
 * Doanh thu của một hạng mục cụ thể (một dịch vụ hoặc một phụ tùng).
 *
 * <p>Tên hiển thị lấy từ {@code invoice_items.snapshot_name} — snapshot tại thời
 * điểm lập hóa đơn, nên đổi tên dịch vụ sau này KHÔNG làm sai lịch sử báo cáo.
 *
 * <p>{@code catalogId} trỏ tới danh mục ở {@code inventory-service} — dùng để
 * gom theo nhóm dịch vụ khi service đó cung cấp thông tin.
 */
public record RevenueByItemResponse(
        UUID catalogId,
        /** Loại hạng mục: {@code SERVICE} (dịch vụ) hoặc {@code PART} (phụ tùng). */
        InvoiceItemType itemType,
        /** Mã hạng mục (SKU với phụ tùng, mã dịch vụ với dịch vụ). */
        String code,
        /** Tên hạng mục. */
        String name,
        /** Tổng số lượng bán ra. */
        long quantity,
        /** Doanh thu gross của hạng mục này. */
        BigDecimal grossRevenue,
        /** Doanh thu thuần (sau khi phân bổ chiết khấu theo tỉ lệ dòng hàng). */
        BigDecimal netRevenue,
        /** Tỉ lệ chiếm trong tổng doanh thu gross của kỳ (0..1). */
        BigDecimal ratio
) {
    public RevenueByItemResponse {
        grossRevenue = scale(grossRevenue);
        netRevenue = scale(netRevenue);
        ratio = scale(ratio);
    }

    private static BigDecimal scale(BigDecimal value) {
        return value == null ? BigDecimal.ZERO : value;
    }
}
