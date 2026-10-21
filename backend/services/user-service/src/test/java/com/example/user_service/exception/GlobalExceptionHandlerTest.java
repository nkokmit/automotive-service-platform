package com.example.user_service.exception;

import com.example.user_service.common.ApiResponse;
import org.hibernate.exception.ConstraintViolationException;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.sql.SQLException;

import static org.assertj.core.api.Assertions.assertThat;

class GlobalExceptionHandlerTest {

    private final GlobalExceptionHandler handler = new GlobalExceptionHandler();

    @Test
    void duplicateEmailConstraintReturnsConflictErrorCode() {
        DataIntegrityViolationException ex = new DataIntegrityViolationException(
                "duplicate email",
                new ConstraintViolationException(
                        "duplicate email", new SQLException("duplicate"), "uk_users_email"));

        ResponseEntity<ApiResponse<Void>> response = handler.handleDataIntegrityViolation(ex);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().code()).isEqualTo(ErrorCode.USER_EMAIL_EXISTS.getCode());
    }

    @Test
    void duplicatePhoneConstraintReturnsConflictErrorCode() {
        DataIntegrityViolationException ex = new DataIntegrityViolationException(
                "duplicate phone",
                new ConstraintViolationException(
                        "duplicate phone", new SQLException("duplicate"), "uk_users_phone"));

        ResponseEntity<ApiResponse<Void>> response = handler.handleDataIntegrityViolation(ex);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().code()).isEqualTo(ErrorCode.USER_PHONE_EXISTS.getCode());
    }
}
