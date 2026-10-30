package com.example.inventory_service.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;

import java.util.List;

/**
 * Kiểm tra tồn kho tức thời cho một danh sách dòng báo giá.
 *
 * <p>Endpoint đồng bộ (PLAN.md §4.3): service khác gửi danh sách phụ tùng
 * cần kiểm tra, nhận về tồn khả dụng và cờ đủ hàng cho từng mã.
 *
 * <p>Dùng chung {@link StockItemRequest} với các thao tác kho vì cùng một
 * hình dạng dữ liệu: mã phụ tùng + số lượng cần.
 */
public record StockAvailabilityRequest(
        @NotEmpty(message = "Danh sách phụ tùng không được để trống")
        @Valid
        List<StockItemRequest> items
) {
}
