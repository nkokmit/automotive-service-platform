package com.example.staff_service.exception;

public class StaffUserIdAlreadyExistsException extends ApiException {

    public StaffUserIdAlreadyExistsException(String message) {
        super(ErrorCode.STAFF_USER_ID_EXISTS, message);
    }
}
