package com.example.inventory_service.exception;

public class PartNotFoundException extends ApiException {

    public PartNotFoundException(String message) {
        super(ErrorCode.PART_NOT_FOUND, message);
    }
}
