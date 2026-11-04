package com.example.inventory_service.exception;

public class PartAlreadyExistsException extends ApiException {

    public PartAlreadyExistsException(String message) {
        super(ErrorCode.PART_ALREADY_EXISTS, message);
    }
}
