package com.example.inventory_service.exception;

public class ServiceCategoryNotFoundException extends ApiException {

    public ServiceCategoryNotFoundException(String message) {
        super(ErrorCode.SERVICE_CATEGORY_NOT_FOUND, message);
    }
}
