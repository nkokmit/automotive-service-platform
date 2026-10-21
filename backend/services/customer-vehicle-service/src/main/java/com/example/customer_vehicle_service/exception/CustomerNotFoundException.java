package com.example.customer_vehicle_service.exception;

public class CustomerNotFoundException extends ApiException {

    public CustomerNotFoundException(String message) {
        super(ErrorCode.CUSTOMER_NOT_FOUND, message);
    }
}