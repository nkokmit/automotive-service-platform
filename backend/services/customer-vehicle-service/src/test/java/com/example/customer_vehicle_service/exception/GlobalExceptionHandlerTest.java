package com.example.customer_vehicle_service.exception;

import com.example.customer_vehicle_service.common.ApiResponse;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Test message thực sự đi ra client cho lỗi phân quyền.
 *
 * <p>Điểm cốt lõi của nhóm test này là sự phân biệt giữa hai loại từ chối:
 * {@code @PreAuthorize} thiếu quyền thì message chung là đủ, còn
 * {@link CustomerProfileUnresolvedException} thì phải nói rõ vì sao bị chặn
 * và cần làm gì. Gộp hai loại lại là lỗi đã gặp: client chỉ thấy "bạn không có
 * quyền" cho một tài khoản hoàn toàn hợp lệ.
 *
 * <p>Chạy qua MockMvc + {@code @RestControllerAdvice} thật ở
 * {@code UnlinkedCustomerProfileResponseTest} để kiểm chứng Spring thực sự
 * chọn handler theo độ đặc biệt của kiểu; ở đây chỉ kiểm logic trả về.
 */
class GlobalExceptionHandlerTest {

    private final GlobalExceptionHandler handler = new GlobalExceptionHandler();

    /**
     * Lỗi gốc: tài khoản đã đăng nhập nhưng chưa có hồ sơ khách hàng.
     * Phải trả 1403 kèm nguyên nhân cụ thể để người dùng biết cần liên kết hồ sơ.
     */
    @Test
    void unlinkedAccountKeepsItsExplanatoryMessage() {
        ResponseEntity<ApiResponse<Void>> response = handler.handleUnresolvedCustomerProfile(
                new CustomerProfileUnresolvedException("Tài khoản chưa được liên kết với hồ sơ khách hàng"));

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
        ApiResponse<Void> body = response.getBody();
        assertThat(body).isNotNull();
        assertThat(body.code()).isEqualTo(ErrorCode.UNAUTHORIZED.getCode());
        assertThat(body.message()).isEqualTo("Tài khoản chưa được liên kết với hồ sơ khách hàng");
    }

    /**
     * Thiếu quyền trên operation vẫn giữ message chung: message mặc định của
     * {@code @PreAuthorize} là chi tiết cấu hình nội bộ, trả ra client sẽ vỡ hợp
     * đồng phân quyền và gợi đúng thông tin cấu hình cho người dùng.
     */
    @Test
    void missingAuthorityKeepsGenericMessage() {
        ResponseEntity<ApiResponse<Void>> response = handler.handleAccessDenied(
                new AccessDeniedException("Access Denied"));

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
        ApiResponse<Void> body = response.getBody();
        assertThat(body).isNotNull();
        assertThat(body.code()).isEqualTo(ErrorCode.UNAUTHORIZED.getCode());
        assertThat(body.message()).isEqualTo(ErrorCode.UNAUTHORIZED.getMessage());
    }

    /**
     * Tham số sai kiểu là lỗi client nên trả 400, không phải 500. Test khoá luôn
     * việc không rò message gốc của Spring: với {@code customerId} là path
     * variable, message đó là cả stack trace nội bộ.
     */
    @Test
    void typeMismatchReports400AndNamesTheParameterOnly() {
        MethodArgumentTypeMismatchException ex = new MethodArgumentTypeMismatchException(
                "abc", UUID.class, "customerId", null, new IllegalArgumentException());

        ResponseEntity<ApiResponse<Void>> response = handler.handleTypeMismatch(ex);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        ApiResponse<Void> body = response.getBody();
        assertThat(body).isNotNull();
        assertThat(body.code()).isEqualTo(ErrorCode.INVALID_REQUEST.getCode());
        assertThat(body.message()).isEqualTo("Tham số 'customerId' phải là UUID");
    }

    /**
     * Path variable/query param không ép kiểu được thì Spring để
     * {@code requiredType} là {@code null}, và handler phải sống sót chứ không
     * {@code NullPointerException}. Trường hợp này không dễ dựng từ constructor
     * công khai, nên test gọi thẳng handler với exception dựng sẵn — thứ cần khoá
     * là hành vi khi thiếu kiểu đích, không phải cách Spring tạo exception.
     */
    @Test
    void typeMismatchSurvivesMissingRequiredType() {
        MethodArgumentTypeMismatchException ex = new MethodArgumentTypeMismatchException(
                "not-a-number", (Class<?>) null, "page", null, new IllegalArgumentException());

        ResponseEntity<ApiResponse<Void>> response = handler.handleTypeMismatch(ex);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        ApiResponse<Void> body = response.getBody();
        assertThat(body).isNotNull();
        assertThat(body.message()).isEqualTo("Tham số 'page' phải là hợp lệ");
    }
}