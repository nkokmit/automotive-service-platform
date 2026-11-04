package com.example.inventory_service.dto.response;

import java.util.UUID;

/**
 * Kết quả kiểm tra tồn kho tức thời cho một dòng báo giá.
 *
 * <p>{@code availableStock = onHandStock - reservedStock}: tồn thực trừ phần
 * đã bị giữ chỗ cho Work Order khác.
 *
 * <p>{@code sufficient} là {@code false} khi tồn không đủ hoặc phụ tùng đã
 * ngừng hoạt động ({@code isActive = false}). Phân biệt hai trường hợp này để
 * service gọi có thể báo lý do cho khách hàng.
 *
 * @param partId            mã phụ tùng
 * @param sku              mã SKU để hiển thị
 * @param name             tên phụ tùng
 * @param requestedQuantity số lượng được yêu cầu
 * @param onHandStock      tồn thực trong kho
 * @param reservedStock    tồn đang bị giữ chỗ
 * @param availableStock   tồn khả dụng
 * @param sufficient       đủ hàng hay không
 * @param isActive         phụ tùng còn hoạt động hay không
 */
public record StockAvailabilityResponse(
        UUID partId,
        String sku,
        String name,
        Integer requestedQuantity,
        Integer onHandStock,
        Integer reservedStock,
        Integer availableStock,
        Boolean sufficient,
        Boolean isActive
) {
}
