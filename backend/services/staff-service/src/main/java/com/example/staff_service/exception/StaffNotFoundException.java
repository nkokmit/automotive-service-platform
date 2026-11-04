package com.example.staff_service.exception;

public class StaffNotFoundException extends ApiException {

    public StaffNotFoundException(String message) {
        super(ErrorCode.STAFF_NOT_FOUND, message);
    }
}
