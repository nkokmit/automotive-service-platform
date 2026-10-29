package com.example.inventory_service.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.List;
import java.util.UUID;

/**
 * Yêu cầu giữ chỗ, xuất kho hoặc giải phóng tồn kho cho một Work Order.
 * {@code referenceId} là ID Work Order và được ghi vào sổ kho với
 * {@code reference_type = WORK_ORDER}.
 */
public record StockOperationRequest(
        @NotNull(message = "Mã tham chiếu Work Order không được để trống")
        UUID referenceId,

        @NotEmpty(message = "Danh sách phụ tùng không được để trống")
        @Valid
        List<StockItemRequest> items,

        @Size(max = 2000, message = "Ghi chú tối đa 2000 ký tự")
        String note
) {
}
