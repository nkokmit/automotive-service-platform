package com.example.staff_service.exception;

public class WorkShiftNotFoundException extends ApiException {

    public WorkShiftNotFoundException(String message) {
        super(ErrorCode.WORK_SHIFT_NOT_FOUND, message);
    }
}
