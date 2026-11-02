package com.example.booking_service.enums;

public enum BookingStatus {
    CONFIRMED,
    CANCELLED,
    NO_SHOW,
    CHECKED_IN,
    FULFILLED;

    public boolean holdsCapacity() {
        return this == CONFIRMED || this == CHECKED_IN;
    }
}
