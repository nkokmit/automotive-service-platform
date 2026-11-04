package com.example.inventory_service.dto.response;

import java.math.BigDecimal;
import java.util.UUID;

/**
 * Đơn giá phụ tùng để lập Báo giá.
 *
 * <p>Chỉ trả đơn giá bán ({@code sellingPrice}). Giá vốn ({@code costPrice})
 * là dữ liệu biên lợi nhuận nội bộ của Inventory Service, không đưa ra ngoài
 * qua contract đồng bộ.
 *
 * @param partId        mã phụ tùng
 * @param sku          mã SKU
 * @param name         tên phụ tùng
 * @param unit         đơn vị tính
 * @param sellingPrice đơn giá bán
 * @param quantity     số lượng được yêu cầu
 * @param lineTotal    tổng tiền = đơn giá x số lượng
 * @param availableStock tồn khả dụng tại thời điểm gọi
 * @param isActive     phụ tùng còn hoạt động hay không
 */
public record PartPricingResponse(
        UUID partId,
        String sku,
        String name,
        String unit,
        BigDecimal sellingPrice,
        Integer quantity,
        BigDecimal lineTotal,
        Integer availableStock,
        Boolean isActive
) {
}
