package com.example.inventory_service.exception;

/**
 * Thao tác không hợp lệ với trạng thái hiện tại của đơn nhập hàng.
 *
 * <p>Ví dụ: duyệt đơn đang ở {@code RECEIVED}, sửa đơn không còn ở
 * {@code DRAFT}, nhập kho đơn chưa được duyệt.
 */
public class InvalidPurchaseOrderStatusException extends ApiException {

    public InvalidPurchaseOrderStatusException(String message) {
        super(ErrorCode.PURCHASE_ORDER_INVALID_STATUS, message);
    }
}
