package com.example.staff_service.exception;

public class StaffAbsenceNotFoundException extends ApiException {

    public StaffAbsenceNotFoundException(String message) {
        super(ErrorCode.STAFF_ABSENCE_NOT_FOUND, message);
    }
}
