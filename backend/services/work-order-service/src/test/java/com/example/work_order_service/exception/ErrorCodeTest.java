package com.example.work_order_service.exception;

import org.junit.jupiter.api.Test;

import java.util.Arrays;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;

class ErrorCodeTest {

    @Test
    void assignsUniqueCodesToDocumentedGroups() {
        Map<ErrorCode, Integer> expected = Map.ofEntries(
                Map.entry(ErrorCode.INVALID_REQUEST, 6000),
                Map.entry(ErrorCode.WORK_ORDER_NOT_FOUND, 6001),
                Map.entry(ErrorCode.INVALID_WORK_ORDER_STATUS_TRANSITION, 6002),
                Map.entry(ErrorCode.ESTIMATE_NOT_FOUND, 6101),
                Map.entry(ErrorCode.ESTIMATE_NOT_EDITABLE, 6102),
                Map.entry(ErrorCode.SERVICE_LINE_NOT_FOUND, 6103),
                Map.entry(ErrorCode.PART_LINE_NOT_FOUND, 6104),
                Map.entry(ErrorCode.ESTIMATE_ITEM_DECISION_CONFLICT, 6105),
                Map.entry(ErrorCode.INVALID_SERVICE_LINE_STATUS_TRANSITION, 6106),
                Map.entry(ErrorCode.STAFF_PROFILE_NOT_FOUND, 6107),
                Map.entry(ErrorCode.STAFF_PROFILE_INACTIVE, 6108),
                Map.entry(ErrorCode.BOOKING_NOT_FOUND, 6201),
                Map.entry(ErrorCode.BOOKING_NOT_CHECKED_IN, 6202),
                Map.entry(ErrorCode.BOOKING_VEHICLE_REQUIRED, 6203),
                Map.entry(ErrorCode.CUSTOMER_NOT_FOUND, 6301),
                Map.entry(ErrorCode.VEHICLE_NOT_FOUND, 6302),
                Map.entry(ErrorCode.SERVICE_NOT_FOUND, 6401),
                Map.entry(ErrorCode.SERVICE_NOT_ACTIVE, 6402),
                Map.entry(ErrorCode.BOM_PART_NOT_ACTIVE, 6403),
                Map.entry(ErrorCode.PART_NOT_FOUND, 6404),
                Map.entry(ErrorCode.PART_NOT_ACTIVE, 6405),
                Map.entry(ErrorCode.PART_RESERVATION_NOT_FOUND, 6406),
                Map.entry(ErrorCode.INTEGRATION_SERVICE_UNAVAILABLE, 6501),
                Map.entry(ErrorCode.UNAUTHENTICATED, 1401),
                Map.entry(ErrorCode.UNAUTHORIZED, 1403),
                Map.entry(ErrorCode.UNCATEGORIZED_EXCEPTION, 9999));

        assertEquals(ErrorCode.values().length, expected.size());
        expected.forEach((error, code) -> assertEquals(code, error.getCode(), error.name()));
        assertEquals(ErrorCode.values().length,
                Arrays.stream(ErrorCode.values()).map(ErrorCode::getCode).distinct().count());
    }

    @Test
    void exceptionHandlerReturnsRegroupedCodeAndExistingStatus() {
        var response = new GlobalExceptionHandler()
                .handleApiException(new ApiException(ErrorCode.ESTIMATE_NOT_FOUND));

        assertEquals(ErrorCode.ESTIMATE_NOT_FOUND.getHttpStatus(), response.getStatusCode());
        assertEquals(6101, response.getBody().code());
        assertEquals(ErrorCode.ESTIMATE_NOT_FOUND.getMessage(), response.getBody().message());
    }
}
