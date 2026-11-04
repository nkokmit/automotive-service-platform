package com.example.inventory_service.exception;

public class PurchaseOrderNotFoundException extends ApiException {

    public PurchaseOrderNotFoundException(String message) {
        super(ErrorCode.PURCHASE_ORDER_NOT_FOUND, message);
    }
}
