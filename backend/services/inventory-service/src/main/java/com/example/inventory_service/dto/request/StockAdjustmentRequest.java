package com.example.inventory_service.dto.request;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/**
 * Lệnh nhập / hiệu chỉnh tồn kho thủ công cho một phụ tùng.
 *
 * <p>Khác với luồng đơn nhập hàng (PO 3 bước), endpoint này cho phép admin
 * nhập tồn đầu tiên hoặc sửa chênh lệch kiểm kê ngay tại màn hình quản trị.
 * Mọi thay đổi vẫn được ghi vào sổ kho {@code inventory_transactions}.
 *
 * @param mode    {@code ADD} = cộng thêm vào tồn thực, {@code SET} = đặt tồn thực bằng đúng giá trị.
 * @param quantity số lượng (với {@code ADD} là số cộng thêm, với {@code SET} là tồn thực mới).
 * @param note    ghi chú tuỳ chọn.
 */
public record StockAdjustmentRequest(
        @NotNull(message = "Chế độ điều chỉnh không được để trống")
        StockAdjustmentMode mode,

        @NotNull(message = "Số lượng không được để trống")
        @Min(value = 0, message = "Số lượng không được âm")
        Integer quantity,

        @Size(max = 1000, message = "Ghi chú tối đa 1000 ký tự")
        String note
) {
    public enum StockAdjustmentMode {
        /** Cộng thêm vào tồn thực (nhập hàng đầu tiên, nhập bổ sung). */
        ADD,
        /** Đặt tồn thực bằng đúng số lượng (hiệu chỉnh sau kiểm kê). */
        SET
    }
}
