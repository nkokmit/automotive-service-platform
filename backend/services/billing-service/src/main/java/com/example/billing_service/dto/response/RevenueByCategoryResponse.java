package com.example.billing_service.dto.response;

import java.math.BigDecimal;
import java.util.UUID;

/**
 * Doanh thu gom theo NHÓM DỊCH VỤ (VD: "Bảo dưỡng chung", "Sơn & thân vỏ").
 *
 * <p>Nhóm dịch vụ thuộc sở hữu của {@code inventory-service}. {@code billing-service}
 * gọi API nội bộ của service đó để biết mỗi dịch vụ thuộc nhóm nào — không
 * join chéo database (GLOBAL_RULES §1).
 *
 * <p>Hạng mục {@code PART} (phụ tùng) không thuộc nhóm dịch vụ nào nên được gom
 * vào nhóm riêng (xem {@code categoryName}).
 */
public record RevenueByCategoryResponse(
        UUID categoryId,
        String categoryName,
        BigDecimal grossRevenue,
        BigDecimal netRevenue,
        long itemCount,
        /** Tỉ lệ chiếm trong tổng doanh thu gross của kỳ (0..1). */
        BigDecimal ratio
) {
    public RevenueByCategoryResponse {
        grossRevenue = scale(grossRevenue);
        netRevenue = scale(netRevenue);
        ratio = scale(ratio);
    }

    private static BigDecimal scale(BigDecimal value) {
        return value == null ? BigDecimal.ZERO : value;
    }
}
