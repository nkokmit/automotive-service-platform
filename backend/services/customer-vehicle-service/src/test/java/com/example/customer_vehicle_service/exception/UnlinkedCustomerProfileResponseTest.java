package com.example.customer_vehicle_service.exception;

import com.example.customer_vehicle_service.controller.CustomerController;
import com.example.customer_vehicle_service.dto.response.CustomerResponse;
import com.example.customer_vehicle_service.service.CustomerService;
import com.example.customer_vehicle_service.service.CurrentCustomerService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.UUID;

import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Test hợp đồng HTTP của {@code GET /api/customers/me} khi tài khoản chưa có
 * hồ sơ khách hàng.
 *
 * <p>Đây là bản tái hiện đúng lỗi đã gặp: {@code CurrentCustomerService} ném
 * exception với message cụ thể, nhưng trước đây
 * {@link GlobalExceptionHandler#handleAccessDenied} bỏ qua message nên client
 * luôn nhận "Bạn không có quyền" dù tài khoản hoàn toàn hợp lệ.
 *
 * <p>Test chạy qua MockMvc với {@link GlobalExceptionHandler} đăng ký thật
 * chứ không gọi handler trực tiếp như {@link GlobalExceptionHandlerTest}.
 * Lý do: lỗi gốc nằm ở chỗ <em>Spring chọn handler nào</em> cho exception đó,
 * chứ không phải logic bên trong một handler. Nếu chỉ unit-test từng handler
 * thì một handler mới khai báo sai kiểu (ví dụ {@code throws} rộng hơn thực tế)
 * vẫn pass và bug tái diễn. Ở đây exception đi từ controller đi qua advice
 * thật nên độ đặc biệt của kiểu được kiểm chứng đúng như lúc chạy thật.
 *
 * <p>Không dùng {@code @PreAuthorize} trong test này: {@code standaloneSetup}
 * không bật method security. Phần đó đã được
 * {@code VehicleControllerSecurityTest} kiểm bằng Spring proxy, còn test này
 * lo phần message.
 */
@ExtendWith(MockitoExtension.class)
class UnlinkedCustomerProfileResponseTest {

    @Mock
    private CustomerService customerService;
    @Mock
    private CurrentCustomerService currentCustomerService;

    private MockMvc mvc;

    @BeforeEach
    void setUp() {
        mvc = MockMvcBuilders
                .standaloneSetup(new CustomerController(customerService, currentCustomerService))
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    /**
     * Lỗi gốc: tài khoản đã đăng nhập nhưng chưa có hồ sơ khách hàng. Phải trả
     * 1403 kèm nguyên nhân cụ thể để người dùng biết cần liên hệ gara liên kết
     * tài khoản, thay vì tưởng mình thiếu quyền.
     */
    @Test
    void unlinkedAccountGetsActionableMessageNotGenericAccessDenied() throws Exception {
        given(currentCustomerService.getRequiredCustomerId())
                .willThrow(new CustomerProfileUnresolvedException(
                        "Tài khoản chưa được liên kết với hồ sơ khách hàng"));

        mvc.perform(get("/api/customers/me").accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value(ErrorCode.UNAUTHORIZED.getCode()))
                .andExpect(jsonPath("$.message")
                        .value("Tài khoản chưa được liên kết với hồ sơ khách hàng"))
                .andExpect(jsonPath("$.result").doesNotExist());

        // Không được đọc được hồ sơ nào: lỗi phải chặn trước cả lớp service.
        verifyNoInteractions(customerService);
    }

    /**
     * Thiếu quyền trên operation vẫn trả message chung — hợp đồng song song cần
     * giữ, không phải thứ bị sửa nhầm khi mở message cho {@code /me}. Nếu handler
     * riêng nuốt luôn case này thì mọi lỗi phân quyền đều lộ chi tiết nội bộ.
     */
    @Test
    void plainAccessDeniedStillGetsGenericMessage() throws Exception {
        given(currentCustomerService.getRequiredCustomerId())
                .willThrow(new AccessDeniedException("Access Denied"));

        mvc.perform(get("/api/customers/me").accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value(ErrorCode.UNAUTHORIZED.getCode()))
                .andExpect(jsonPath("$.message").value(ErrorCode.UNAUTHORIZED.getMessage()));
    }

    /** Hồ sơ đã liên kết thì endpoint trả dữ liệu bình thường, không bị ảnh hưởng. */
    @Test
    void linkedAccountStillReceivesItsProfile() throws Exception {
        UUID customerId = UUID.randomUUID();
        given(currentCustomerService.getRequiredCustomerId()).willReturn(customerId);
        given(customerService.getCustomerById(customerId)).willReturn(new CustomerResponse(
                customerId, null, "Nguyễn Văn A", "0900000000", "a@example.com",
                null, null, true, null, null));

        mvc.perform(get("/api/customers/me").accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(0))
                .andExpect(jsonPath("$.result.id").value(customerId.toString()));
    }
}