package com.example.booking_service.exception;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;

import static org.junit.jupiter.api.Assertions.assertEquals;

class GlobalExceptionHandlerTest {

    private final GlobalExceptionHandler handler = new GlobalExceptionHandler();

    @Test
    void capacityShortageReturnsConflict() {
        var response = handler.handleApiException(
                new ApiException(ErrorCode.INSUFFICIENT_TECHNICIAN_CAPACITY));

        assertEquals(HttpStatus.CONFLICT, response.getStatusCode());
        assertEquals(ErrorCode.INSUFFICIENT_TECHNICIAN_CAPACITY.getCode(), response.getBody().code());
    }

    @Test
    void integrationFailureReturnsServiceUnavailable() {
        var response = handler.handleApiException(
                new ApiException(ErrorCode.INTEGRATION_SERVICE_UNAVAILABLE));

        assertEquals(HttpStatus.SERVICE_UNAVAILABLE, response.getStatusCode());
        assertEquals(ErrorCode.INTEGRATION_SERVICE_UNAVAILABLE.getCode(), response.getBody().code());
    }
}
