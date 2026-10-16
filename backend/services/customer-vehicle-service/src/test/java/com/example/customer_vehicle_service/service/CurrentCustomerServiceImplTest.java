package com.example.customer_vehicle_service.service;

import com.example.customer_vehicle_service.entity.Customer;
import com.example.customer_vehicle_service.exception.CustomerProfileUnresolvedException;
import com.example.customer_vehicle_service.repository.CustomerRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verifyNoInteractions;

/**
 * Unit test ánh xạ claim {@code userId} → hồ sơ khách hàng.
 *
 * <p>Mọi đường không xác định được chủ xe đều phải fail closed bằng
 * {@link CustomerProfileUnresolvedException}; nếu một đường lọt, khách hàng có
 * thể đọc dữ liệu mà không xác định được mình là ai.
 *
 * <p>Assert trên {@code CustomerProfileUnresolvedException} chứ không phải
 * {@code AccessDeniedException}: kiểu cụ thể là thứ quyết định client có nhận
 * được message nói rõ cần liên kết hồ sơ hay không. Assert trên kiểu rộng sẽ
 * pass ngay cả khi handler bỏ mất message — đúng lỗi đang sửa.
 */
@ExtendWith(MockitoExtension.class)
class CurrentCustomerServiceImplTest {

    @Mock
    private CustomerRepository customerRepository;
    @InjectMocks
    private CurrentCustomerServiceImpl currentCustomerService;

    private static final UUID USER_ID = UUID.randomUUID();
    private static final UUID CUSTOMER_ID = UUID.randomUUID();

    @BeforeEach
    void tearDownContext() {
        SecurityContextHolder.clearContext();
    }

    @AfterEach
    void clearContext() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void getRequiredCustomerId_resolvesCustomerFromUserIdClaim() {
        authenticateWith(Map.of("userId", USER_ID.toString()));
        given(customerRepository.findByUserId(USER_ID))
                .willReturn(Optional.of(Customer.builder().id(CUSTOMER_ID).build()));

        assertThat(currentCustomerService.getRequiredCustomerId()).isEqualTo(CUSTOMER_ID);
    }

    @Test
    void getRequiredCustomerId_deniesWhenTokenHasNoUserIdClaim() {
        // Token cũ phát trước khi user-service thêm claim: phải từ chối.
        authenticateWith(Map.of());

        assertThatThrownBy(currentCustomerService::getRequiredCustomerId)
                .isInstanceOf(CustomerProfileUnresolvedException.class);

        verifyNoInteractions(customerRepository);
    }

    @Test
    void getRequiredCustomerId_deniesWhenUserIdClaimIsNotUuid() {
        // Token ký đúng nhưng claim sai định dạng: từ chối, không để thành 500.
        authenticateWith(Map.of("userId", "not-a-uuid"));

        assertThatThrownBy(currentCustomerService::getRequiredCustomerId)
                .isInstanceOf(CustomerProfileUnresolvedException.class);

        verifyNoInteractions(customerRepository);
    }

    @Test
    void getRequiredCustomerId_deniesWhenNoCustomerLinkedToAccount() {
        authenticateWith(Map.of("userId", USER_ID.toString()));
        given(customerRepository.findByUserId(USER_ID)).willReturn(Optional.empty());

        assertThatThrownBy(currentCustomerService::getRequiredCustomerId)
                .isInstanceOf(CustomerProfileUnresolvedException.class);
    }

    /**
     * Case hay gặp nhất: tài khoản đăng ký xong nhưng chưa được gara liên kết
     * hồ sơ. Message phải chỉ ra đúng việc cần làm, không phải câu chung
     * "bạn không có quyền" — nếu không, người dùng đi tìm vấn đề quyền hạn
     * trong khi vấn đề là hồ sơ.
     */
    @Test
    void getRequiredCustomerId_explainsMissingCustomerLink() {
        authenticateWith(Map.of("userId", USER_ID.toString()));
        given(customerRepository.findByUserId(USER_ID)).willReturn(Optional.empty());

        assertThatThrownBy(currentCustomerService::getRequiredCustomerId)
                .isInstanceOf(CustomerProfileUnresolvedException.class)
                .hasMessage("Tài khoản chưa được liên kết với hồ sơ khách hàng");
    }

    @Test
    void getRequiredCustomerId_deniesWithoutAuthentication() {
        assertThatThrownBy(currentCustomerService::getRequiredCustomerId)
                .isInstanceOf(CustomerProfileUnresolvedException.class);

        verifyNoInteractions(customerRepository);
    }

    /** Authentication không phải JWT (đường vào khác) không có claim để đọc. */
    @Test
    void getRequiredCustomerId_deniesWhenAuthenticationIsNotJwt() {
        SecurityContextHolder.getContext().setAuthentication(
                UsernamePasswordAuthenticationToken.authenticated("tester", null, List.of()));

        assertThatThrownBy(currentCustomerService::getRequiredCustomerId)
                .isInstanceOf(CustomerProfileUnresolvedException.class);

        verifyNoInteractions(customerRepository);
    }

    private void authenticateWith(Map<String, Object> claims) {
        Jwt.Builder builder = Jwt.withTokenValue("token")
                .header("alg", "HS256")
                .subject("tester")
                .issuedAt(Instant.now())
                .expiresAt(Instant.now().plusSeconds(600));
        claims.forEach(builder::claim);

        SecurityContextHolder.getContext().setAuthentication(
                new JwtAuthenticationToken(builder.build(),
                        List.of(new SimpleGrantedAuthority("ROLE_CUSTOMER")), "tester"));
    }
}