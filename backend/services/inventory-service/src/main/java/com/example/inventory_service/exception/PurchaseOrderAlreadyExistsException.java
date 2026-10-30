package com.example.inventory_service.exception;

public class PurchaseOrderAlreadyExistsException extends ApiException {

    public PurchaseOrderAlreadyExistsException(String message) {
        super(ErrorCode.PURCHASE_ORDER_ALREADY_EXISTS, message);
    }
}
