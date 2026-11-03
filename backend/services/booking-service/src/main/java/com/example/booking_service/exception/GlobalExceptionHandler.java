package com.example.booking_service.exception;

import com.example.booking_service.common.ApiResponse;
import jakarta.validation.ConstraintViolationException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;

import java.util.stream.Collectors;

@RestControllerAdvice
@Slf4j
public class GlobalExceptionHandler {
    @ExceptionHandler(ApiException.class)
    public ResponseEntity<ApiResponse<Void>> handleApiException(ApiException ex) {
        log.warn("Business exception [{}]: {}", ex.getErrorCode().getCode(), ex.getMessage());
        return ResponseEntity.status(statusFor(ex.getErrorCode()))
                .body(ApiResponse.error(ex.getErrorCode(), ex.getMessage()));
    }

    private HttpStatus statusFor(ErrorCode errorCode) {
        return switch (errorCode) {
            case UNAUTHENTICATED -> HttpStatus.UNAUTHORIZED;
            case UNAUTHORIZED -> HttpStatus.FORBIDDEN;
            case BOOKING_NOT_FOUND, SERVICE_NOT_FOUND, CUSTOMER_NOT_FOUND, VEHICLE_NOT_FOUND -> HttpStatus.NOT_FOUND;
            case INSUFFICIENT_TECHNICIAN_CAPACITY, VEHICLE_ALREADY_LINKED, VEHICLE_PLATE_MISMATCH,
                 CHECK_IN_REQUIREMENTS_NOT_MET -> HttpStatus.CONFLICT;
            case INTEGRATION_SERVICE_UNAVAILABLE -> HttpStatus.SERVICE_UNAVAILABLE;
            default -> HttpStatus.BAD_REQUEST;
        };
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiResponse<Void>> handleValidation(MethodArgumentNotValidException ex) {
        String message = ex.getBindingResult().getFieldErrors().stream()
                .map(FieldError::getDefaultMessage)
                .collect(Collectors.joining("; "));
        log.warn("Validation failed: {}", message);
        return ResponseEntity.badRequest().body(ApiResponse.error(ErrorCode.INVALID_REQUEST, message));
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<ApiResponse<Void>> handleUnreadableBody(HttpMessageNotReadableException ex) {
        log.warn("Unreadable request body: {}", ex.getMessage());
        return ResponseEntity.badRequest().body(ApiResponse.error(ErrorCode.INVALID_REQUEST,
                "Body không hợp lệ: " + ex.getMostSpecificCause().getMessage()));
    }

    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    public ResponseEntity<ApiResponse<Void>> handleTypeMismatch(MethodArgumentTypeMismatchException ex) {
        String requiredType = ex.getRequiredType() == null ? "hợp lệ" : ex.getRequiredType().getSimpleName();
        String message = "Tham số '" + ex.getName() + "' phải là " + requiredType;
        log.warn("Type mismatch: {}", message);
        return ResponseEntity.badRequest().body(ApiResponse.error(ErrorCode.INVALID_REQUEST, message));
    }

    @ExceptionHandler(MissingServletRequestParameterException.class)
    public ResponseEntity<ApiResponse<Void>> handleMissingRequestParameter(
            MissingServletRequestParameterException ex
    ) {
        String message = "Thiếu tham số '" + ex.getParameterName() + "'";
        log.warn("Missing request parameter: {}", message);
        return ResponseEntity.badRequest().body(ApiResponse.error(ErrorCode.INVALID_REQUEST, message));
    }

    @ExceptionHandler(ConstraintViolationException.class)
    public ResponseEntity<ApiResponse<Void>> handleConstraintViolation(ConstraintViolationException ex) {
        log.warn("Constraint violation: {}", ex.getMessage());
        return ResponseEntity.badRequest().body(ApiResponse.error(ErrorCode.INVALID_REQUEST, ex.getMessage()));
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ApiResponse<Void>> handleAccessDenied(AccessDeniedException ex) {
        log.warn("Access denied: {}", ex.getMessage());
        return ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(ApiResponse.error(ErrorCode.UNAUTHORIZED));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiResponse<Void>> handleUnknown(Exception ex) {
        log.error("Unhandled exception", ex);
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(ApiResponse.error(ErrorCode.UNCATEGORIZED_EXCEPTION, ex.getMessage()));
    }
}
