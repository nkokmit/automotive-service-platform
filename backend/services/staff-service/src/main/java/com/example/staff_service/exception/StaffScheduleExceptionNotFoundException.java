package com.example.staff_service.exception;

public class StaffScheduleExceptionNotFoundException extends ApiException {

    public StaffScheduleExceptionNotFoundException(String message) {
        super(ErrorCode.STAFF_SCHEDULE_EXCEPTION_NOT_FOUND, message);
    }
}
