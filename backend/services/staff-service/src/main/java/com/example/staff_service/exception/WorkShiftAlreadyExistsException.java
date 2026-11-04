package com.example.staff_service.exception;

public class WorkShiftAlreadyExistsException extends ApiException {

    public WorkShiftAlreadyExistsException(String message) {
        super(ErrorCode.WORK_SHIFT_ALREADY_EXISTS, message);
    }
}
