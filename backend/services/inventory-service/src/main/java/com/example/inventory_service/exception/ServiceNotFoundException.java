package com.example.inventory_service.exception;

public class ServiceNotFoundException extends ApiException {

    public ServiceNotFoundException(String message) {
        super(ErrorCode.SERVICE_NOT_FOUND, message);
    }
}
