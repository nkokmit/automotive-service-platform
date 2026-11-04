package com.example.inventory_service.exception;

public class SupplierAlreadyExistsException extends ApiException {

    public SupplierAlreadyExistsException(String message) {
        super(ErrorCode.SUPPLIER_ALREADY_EXISTS, message);
    }
}
