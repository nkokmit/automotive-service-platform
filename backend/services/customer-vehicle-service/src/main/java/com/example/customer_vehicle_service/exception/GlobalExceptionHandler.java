package com.example.customer_vehicle_service.exception;

import com.example.customer_vehicle_service.common.ApiResponse;
import jakarta.validation.ConstraintViolationException;
import lombok.extern.slf4j.Slf4j;
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

/**
 * Centralized exception handler cho toàn bộ service.
 * Trả về {@link ApiResponse} thống nhất với mọi lỗi.
 */
@RestControllerAdvice
@Slf4j
public class GlobalExceptionHandler {

    @ExceptionHandler(ApiException.class)
    public ResponseEntity<ApiResponse<Void>> handleApiException(ApiException ex) {
        ErrorCode errorCode = ex.getErrorCode();
        log.warn("Business exception [{}]: {}", errorCode.getCode(), ex.getMessage());
        return ResponseEntity
                .status(HttpStatus.BAD_REQUEST)
                .body(ApiResponse.error(errorCode, ex.getMessage()));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiResponse<Void>> handleValidation(MethodArgumentNotValidException ex) {
        String message = ex.getBindingResult().getFieldErrors().stream()
                .map(FieldError::getDefaultMessage)
                .collect(Collectors.joining("; "));
        log.warn("Validation failed: {}", message);
        return ResponseEntity
                .status(HttpStatus.BAD_REQUEST)
                .body(ApiResponse.error(ErrorCode.INVALID_REQUEST, message));
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<ApiResponse<Void>> handleUnreadableBody(HttpMessageNotReadableException ex) {
        // Body không parse được (JSON sai, kiểu sai, enum không tồn tại) là lỗi
        // của client. Không có handler riêng thì exception này rơi xuống
        // handleUnknown và client nhận 500, tưởng server lỗi.
        log.warn("Unreadable request body: {}", ex.getMessage());
        return ResponseEntity
                .status(HttpStatus.BAD_REQUEST)
                .body(ApiResponse.error(ErrorCode.INVALID_REQUEST,
                        "Body không hợp lệ: " + ex.getMostSpecificCause().getMessage()));
    }

    /**
     * Path variable hoặc query param sai kiểu, ví dụ {@code customerId} không
     * phải UUID.
     *
     * <p>Cùng lý do với {@link #handleUnreadableBody}: đây là lỗi của client,
     * nhưng không có handler riêng thì exception rơi xuống
     * {@link #handleUnknown} và client nhận 500, tưởng server lỗi — trong khi
     * 500 lại là loại lỗi khiến cảnh báo giám sát và đội vận hành mở điều tra
     * nhầm.
     *
     * <p>Chỉ đưa tên tham số vào message, không đưa {@code ex.getMessage()}: với
     * kiểu target là {@code Class} (path variable) thì message của Spring là
     * cả stack trace nội bộ, đọc vào như sự cố production còn nặng hơn lỗi gốc.
     */
    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    public ResponseEntity<ApiResponse<Void>> handleTypeMismatch(
            MethodArgumentTypeMismatchException ex) {
        String requiredType = ex.getRequiredType() == null
                ? "hợp lệ"
                : ex.getRequiredType().getSimpleName();
        String message = "Tham số '" + ex.getName() + "' phải là " + requiredType;
        log.warn("Type mismatch: {}", message);
        return ResponseEntity
                .status(HttpStatus.BAD_REQUEST)
                .body(ApiResponse.error(ErrorCode.INVALID_REQUEST, message));
    }

    @ExceptionHandler(ConstraintViolationException.class)
    public ResponseEntity<ApiResponse<Void>> handleConstraintViolation(ConstraintViolationException ex) {
        log.warn("Constraint violation: {}", ex.getMessage());
        return ResponseEntity
                .status(HttpStatus.BAD_REQUEST)
                .body(ApiResponse.error(ErrorCode.INVALID_REQUEST, ex.getMessage()));
    }

    /**
     * Caller đã đăng nhập nhưng chưa có hồ sơ khách hàng để ánh xạ.
     *
     * <p>Handler riêng phải đứng trước {@link #handleAccessDenied} về độ đặc
     * biệt của kiểu: Spring chọn handler khớp nhất, nên khai báo cả hai không
     * gây xung đột. Giữ status 403 như handler kia — xem javadoc của
     * {@link CustomerProfileUnresolvedException} về lý do không đổi sang 404.
     *
     * <p>Khác biệt duy nhất là message: handler chung cố tình bỏ qua
     * {@code ex.getMessage()} vì message mặc định của {@code @PreAuthorize} là
     * chi tiết nội bộ về cấu hình quyền. Ở đây message là thông điệp dành cho
     * người dùng và nói đúng việc họ cần làm.
     */
    @ExceptionHandler(CustomerProfileUnresolvedException.class)
    public ResponseEntity<ApiResponse<Void>> handleUnresolvedCustomerProfile(
            CustomerProfileUnresolvedException ex) {
        log.warn("Customer profile unresolved: {}", ex.getMessage());
        return ResponseEntity
                .status(HttpStatus.FORBIDDEN)
                .body(ApiResponse.error(ErrorCode.UNAUTHORIZED.getCode(), ex.getMessage()));
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ApiResponse<Void>> handleAccessDenied(AccessDeniedException ex) {
        log.warn("Access denied: {}", ex.getMessage());
        ErrorCode errorCode = ErrorCode.UNAUTHORIZED;
        return ResponseEntity
                .status(HttpStatus.FORBIDDEN)
                .body(ApiResponse.error(errorCode.getCode(), errorCode.getMessage()));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiResponse<Void>> handleUnknown(Exception ex) {
        log.error("Unhandled exception", ex);
        return ResponseEntity
                .status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(ApiResponse.error(ErrorCode.UNCATEGORIZED_EXCEPTION, ex.getMessage()));
    }
}