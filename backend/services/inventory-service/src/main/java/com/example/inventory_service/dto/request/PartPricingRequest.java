package com.example.inventory_service.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;

import java.util.List;

/**
 * Lấy đơn giá phụ tùng phục vụ lập Báo giá.
 *
 * <p>Endpoint đồng bộ (PLAN.md §4.3): service khác gửi danh sách dòng báo
 * giá cần định giá, nhận về đơn giá bán và tổng tiền theo từng mã.
 *
 * <p>Dùng chung {@link StockItemRequest} với các thao tác kho vì cùng một
 * hình dạng dữ liệu: mã phụ tùng + số lượng cần.
 */
public record PartPricingRequest(
        @NotEmpty(message = "Danh sách phụ tùng không được để trống")
        @Valid
        List<StockItemRequest> items
) {
}
