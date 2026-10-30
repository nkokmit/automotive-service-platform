package com.example.inventory_service.exception;

import com.example.inventory_service.common.ApiResponse;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Test contract lỗi thống nhất của inventory-service (GLOBAL_RULES §15).
 */
class GlobalExceptionHandlerTest {

    private final GlobalExceptionHandler handler = new GlobalExceptionHandler();

    @Test
    void partNotFoundUsesBadRequestAndPartErrorCode() {
        ApiException exception = new PartNotFoundException("Không tìm thấy phụ tùng");

        ResponseEntity<ApiResponse<Void>> response = handler.handleApiException(exception);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().code()).isEqualTo(4301);
        assertThat(response.getBody().message()).isEqualTo("Không tìm thấy phụ tùng");
    }

    @Test
    void insufficientStockUsesDedicatedErrorCode() {
        ApiException exception = new InsufficientStockException("Không đủ tồn kho");

        ResponseEntity<ApiResponse<Void>> response = handler.handleApiException(exception);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().code()).isEqualTo(4601);
    }

    @Test
    void accessDeniedKeepsForbiddenAndSharedAuthorizationCode() {
        ResponseEntity<ApiResponse<Void>> response = handler.handleAccessDenied(
                new AccessDeniedException("Access Denied"));

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().code()).isEqualTo(1403);
    }

    @Test
    void unknownExceptionReturnsInternalServerErrorAndGenericMessage() {
        ResponseEntity<ApiResponse<Void>> response = handler.handleUnknown(new IllegalStateException("internal"));

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.INTERNAL_SERVER_ERROR);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().code()).isEqualTo(9999);
        assertThat(response.getBody().message()).isEqualTo("Lỗi không xác định");
    }
}
