package com.example.customer_vehicle_service.exception;

public class VehicleNotFoundException extends ApiException {

    public VehicleNotFoundException(String message) {
        super(ErrorCode.VEHICLE_NOT_FOUND, message);
    }
}