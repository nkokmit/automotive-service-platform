package com.example.inventory_service.exception;

/**
 * Không đủ tồn kho khả dụng để thực hiện thao tác.
 *
 * <p>Tồn khả dụng = {@code on_hand_stock - reserved_stock}. Giữ chỗ và xuất
 * kho đều phải ném exception này khi thiếu hàng, để tồn kho không bao giờ âm
 * (PLAN.md §5.2).
 */
public class InsufficientStockException extends ApiException {

    public InsufficientStockException(String message) {
        super(ErrorCode.INSUFFICIENT_STOCK, message);
    }
}
