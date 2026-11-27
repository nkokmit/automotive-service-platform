package com.example.billing_service.dto.response;

import java.math.BigDecimal;

/**
 * Tổng quan doanh thu trong một khoảng thời gian.
 *
 * <p>QUY ƯỚC DOANH THU (quan trọng — đọc khi dùng):
 *
 * <ul>
 *   <li><b>Gross</b> ({@code grossRevenue}) = tổng giá trị dòng hóa đơn CHƯA trừ
 *       chiết khấu. Đây là cơ sở để phân bổ "doanh thu theo dịch vụ" — mỗi dịch
 *       vụ đóng góp một phần gross.</li>
 *   <li><b>Net</b> ({@code netRevenue}) = gross − chiết khấu + thuế. Khớp với
 *       tổng {@code grand_total} của các hóa đơn đã phát hành (không tính VOID).</li>
 *   <li><b>Cash-in</b> ({@code collectedRevenue}) = tiền THỰC đã thu: tổng
 *       thanh toán {@code SUCCEEDED} trừ phần đã hoàn ({@code REFUNDED}).
 *       Đây là dòng tiền thật, không phải doanh thu ghi nhận.</li>
 * </ul>
 *
 * <p>Ba khái niệm này có thể khác nhau — ví dụ hóa đơn đã phát hành nhưng khách
 * chưa thanh toán, hoặc đã thanh toán rồi hoàn tiền. Báo cáo hiển thị cả ba để
 * người quản lý không nhầm lẫn.
 */
public record RevenueOverviewResponse(
        /** Tổng giá trị dòng hóa đơn (chưa trừ chiết khấu, chưa cộng thuế). */
        BigDecimal grossRevenue,
        /** Tổng tiền công lao động ({@code subtotal_labor}). */
        BigDecimal totalLabor,
        /** Tổng tiền phụ tùng ({@code subtotal_parts}). */
        BigDecimal totalParts,
        /** Tổng chiết khấu đã áp dụng. */
        BigDecimal totalDiscount,
        /** Tổng thuế. */
        BigDecimal totalTax,
        /** Doanh thu thuần = gross − chiết khấu + thuế. */
        BigDecimal netRevenue,
        /** Số hóa đơn đã phát hành (không tính VOID). */
        long invoiceCount,
        /** Số hóa đơn bị hủy trong kỳ. */
        long voidedInvoiceCount,
        /** Tiền thực đã thu (đã trừ hoàn tiền). */
        BigDecimal collectedRevenue,
        /** Tổng tiền đã hoàn trong kỳ. */
        BigDecimal refundedRevenue,
        /** Công nợ còn lại (hóa đơn đã phát hành nhưng chưa thu đủ). */
        BigDecimal outstandingRevenue,
        /** Giá trị đơn trung bình = netRevenue / invoiceCount. */
        BigDecimal averageInvoiceValue,
        /** Tỉ lệ công lao động trong gross (0..1). */
        BigDecimal laborRatio,
        /** Tỉ lệ phụ tùng trong gross (0..1). */
        BigDecimal partsRatio
) {
    public RevenueOverviewResponse {
        grossRevenue = scale(grossRevenue);
        totalLabor = scale(totalLabor);
        totalParts = scale(totalParts);
        totalDiscount = scale(totalDiscount);
        totalTax = scale(totalTax);
        netRevenue = scale(netRevenue);
        collectedRevenue = scale(collectedRevenue);
        refundedRevenue = scale(refundedRevenue);
        outstandingRevenue = scale(outstandingRevenue);
        averageInvoiceValue = scale(averageInvoiceValue);
        laborRatio = scale(laborRatio);
        partsRatio = scale(partsRatio);
    }

    private static BigDecimal scale(BigDecimal value) {
        return value == null ? BigDecimal.ZERO : value;
    }
}
