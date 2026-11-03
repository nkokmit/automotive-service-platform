package com.example.booking_service.integration.customer;

import com.example.booking_service.common.ApiResponse;
import com.example.booking_service.integration.support.IntegrationCallRetrier;
import com.example.booking_service.exception.ApiException;
import com.example.booking_service.exception.ErrorCode;
import feign.FeignException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Component;

import java.util.UUID;

@Component
@RequiredArgsConstructor
@Slf4j
public class CurrentCustomerIdentityResolver {

    private final CustomerServiceClient customerServiceClient;
    private final IntegrationCallRetrier integrationCallRetrier;

    public CurrentCustomerIdentity resolve(Jwt jwt) {
        if (jwt == null) {
            throw new ApiException(ErrorCode.UNAUTHENTICATED);
        }

        UUID userId;
        try {
            userId = UUID.fromString(jwt.getClaimAsString("userId"));
        } catch (IllegalArgumentException | NullPointerException exception) {
            throw new ApiException(ErrorCode.UNAUTHORIZED, "Token không có userId hợp lệ");
        }

        ApiResponse<CustomerContract> response;
        try {
            response = integrationCallRetrier.execute(
                    "customer-vehicle-service",
                    () -> customerServiceClient.getCurrentCustomer("Bearer " + jwt.getTokenValue()));
        } catch (FeignException exception) {
            if (exception.status() == 401 || exception.status() == 403 || exception.status() == 404) {
                throw new ApiException(ErrorCode.UNAUTHORIZED,
                        "Không tìm thấy hồ sơ khách hàng hợp lệ cho tài khoản");
            }
            log.error("Gọi customer-vehicle-service thất bại (HTTP {}): {}",
                    exception.status(), exception.getMessage());
            throw new ApiException(ErrorCode.INTEGRATION_SERVICE_UNAVAILABLE,
                    "Không thể xác minh hồ sơ khách hàng, vui lòng thử lại sau");
        }

        if (response == null) {
            throw new ApiException(ErrorCode.INTEGRATION_SERVICE_UNAVAILABLE,
                    "customer-vehicle-service trả phản hồi không hợp lệ");
        }
        if (response.code() == 1401 || response.code() == 1403) {
            throw new ApiException(ErrorCode.UNAUTHORIZED,
                    "Không tìm thấy hồ sơ khách hàng hợp lệ cho tài khoản");
        }
        if (response.code() != 0 || response.result() == null || response.result().id() == null) {
            throw new ApiException(ErrorCode.INTEGRATION_SERVICE_UNAVAILABLE,
                    "customer-vehicle-service trả phản hồi không hợp lệ");
        }
        if (!Boolean.TRUE.equals(response.result().isActive())) {
            throw new ApiException(ErrorCode.UNAUTHORIZED, "Hồ sơ khách hàng không hoạt động");
        }
        return new CurrentCustomerIdentity(userId, response.result().id());
    }
}
