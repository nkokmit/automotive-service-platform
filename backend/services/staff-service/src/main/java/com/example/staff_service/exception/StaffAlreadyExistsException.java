package com.example.staff_service.exception;

public class StaffAlreadyExistsException extends ApiException {

    public StaffAlreadyExistsException(String message) {
        super(ErrorCode.STAFF_ALREADY_EXISTS, message);
    }
}
