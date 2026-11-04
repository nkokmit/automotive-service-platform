package com.example.inventory_service.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.List;
import java.util.UUID;

/**
 * Tạo hoặc cập nhật đơn nhập hàng (chỉ khi {@code DRAFT}). Danh sách
 * {@code items} thay thế toàn bộ các dòng hiện có của đơn.
 */
public record PurchaseOrderRequest(
        @Size(max = 50, message = "Mã đơn nhập hàng tối đa 50 ký tự")
        String code,

        @NotNull(message = "Nhà cung cấp không được để trống")
        UUID supplierId,

        @Size(max = 2000, message = "Ghi chú tối đa 2000 ký tự")
        String note,

        @NotEmpty(message = "Đơn nhập hàng phải có ít nhất một mặt hàng")
        @Valid
        List<PurchaseOrderItemRequest> items
) {
}
