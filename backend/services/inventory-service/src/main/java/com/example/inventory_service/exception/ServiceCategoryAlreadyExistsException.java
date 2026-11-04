package com.example.inventory_service.exception;

public class ServiceCategoryAlreadyExistsException extends ApiException {

    public ServiceCategoryAlreadyExistsException(String message) {
        super(ErrorCode.SERVICE_CATEGORY_ALREADY_EXISTS, message);
    }
}
