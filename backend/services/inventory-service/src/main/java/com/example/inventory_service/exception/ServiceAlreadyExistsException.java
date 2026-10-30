package com.example.inventory_service.exception;

public class ServiceAlreadyExistsException extends ApiException {

    public ServiceAlreadyExistsException(String message) {
        super(ErrorCode.SERVICE_ALREADY_EXISTS, message);
    }
}
