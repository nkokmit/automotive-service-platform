package com.example.inventory_service.exception;

public class SupplierNotFoundException extends ApiException {

    public SupplierNotFoundException(String message) {
        super(ErrorCode.SUPPLIER_NOT_FOUND, message);
    }
}
