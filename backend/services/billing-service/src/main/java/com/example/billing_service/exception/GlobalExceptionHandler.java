package com.example.billing_service.exception;

import com.example.billing_service.common.ApiResponse;
import feign.FeignException;
import jakarta.validation.ConstraintViolationException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;

import java.util.stream.Collectors;

@RestControllerAdvice
@Slf4j
public class GlobalExceptionHandler {

    @ExceptionHandler(ApiException.class)
    public ResponseEntity<ApiResponse<Void>> handleApiException(ApiException exception) {
        ErrorCode errorCode = exception.getErrorCode();
        log.warn("Billing operation failed [{}]: {}", errorCode.getCode(), exception.getMessage());
        return ResponseEntity.status(errorCode.getHttpStatus())
                .body(ApiResponse.error(errorCode, exception.getMessage()));
    }

    @ExceptionHandler({
            MethodArgumentNotValidException.class,
            ConstraintViolationException.class,
            MethodArgumentTypeMismatchException.class,
            HttpMessageNotReadableException.class
    })
    public ResponseEntity<ApiResponse<Void>> handleValidation(Exception exception) {
        String message = exception instanceof MethodArgumentNotValidException validationException
                ? validationException.getBindingResult().getFieldErrors().stream()
                .map(FieldError::getDefaultMessage)
                .collect(Collectors.joining("; "))
                : exception.getMessage();
        log.warn("Billing request validation failed: {}", message);
        return ResponseEntity.badRequest().body(ApiResponse.error(ErrorCode.INVALID_REQUEST, message));
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<ApiResponse<Void>> handleDataIntegrity(DataIntegrityViolationException exception) {
        log.error("Billing database constraint violation", exception);
        return ResponseEntity.status(HttpStatus.CONFLICT)
                .body(ApiResponse.error(ErrorCode.INVALID_REQUEST, "Dữ liệu xung đột với hóa đơn hiện có"));
    }

    @ExceptionHandler(FeignException.class)
    public ResponseEntity<ApiResponse<Void>> handleWorkOrderIntegration(FeignException exception) {
        log.error("Work Order integration request failed: status={}", exception.status(), exception);
        ErrorCode errorCode = exception.status() == 404
                ? ErrorCode.WORK_ORDER_NOT_FOUND
                : ErrorCode.WORK_ORDER_SERVICE_UNAVAILABLE;
        return ResponseEntity.status(errorCode.getHttpStatus()).body(ApiResponse.error(errorCode));
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ApiResponse<Void>> handleAccessDenied(AccessDeniedException exception) {
        log.warn("Billing access denied: {}", exception.getMessage());
        return ResponseEntity.status(ErrorCode.UNAUTHORIZED.getHttpStatus())
                .body(ApiResponse.error(ErrorCode.UNAUTHORIZED));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiResponse<Void>> handleUnknown(Exception exception) {
        log.error("Unhandled billing exception", exception);
        return ResponseEntity.internalServerError()
                .body(ApiResponse.error(ErrorCode.UNCATEGORIZED_EXCEPTION));
    }
}
