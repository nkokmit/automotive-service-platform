package com.example.staff_service.exception;

import com.example.staff_service.common.ApiResponse;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;

import static org.assertj.core.api.Assertions.assertThat;

class GlobalExceptionHandlerTest {

    private final GlobalExceptionHandler handler = new GlobalExceptionHandler();

    @Test
    void businessExceptionUsesBadRequestAndDomainErrorCode() {
        ApiException exception = new ApiException(ErrorCode.INVALID_REQUEST, "Yêu cầu không hợp lệ");

        ResponseEntity<ApiResponse<Void>> response = handler.handleApiException(exception);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().code()).isEqualTo(1000);
        assertThat(response.getBody().message()).isEqualTo("Yêu cầu không hợp lệ");
    }

    @Test
    void staffNotFoundUsesNotFoundStatus() {
        ResponseEntity<ApiResponse<Void>> response = handler.handleStaffNotFound(
                new StaffNotFoundException("Không tìm thấy nhân viên"));

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().code()).isEqualTo(3001);
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
