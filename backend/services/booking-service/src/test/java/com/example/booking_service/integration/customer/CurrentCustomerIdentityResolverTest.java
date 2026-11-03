package com.example.booking_service.integration.customer;

import com.example.booking_service.common.ApiResponse;
import com.example.booking_service.integration.support.IntegrationCallRetrier;
import com.example.booking_service.exception.ApiException;
import com.example.booking_service.exception.ErrorCode;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.oauth2.jwt.Jwt;

import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CurrentCustomerIdentityResolverTest {

    private static final UUID USER_ID = UUID.randomUUID();
    private static final UUID CUSTOMER_ID = UUID.randomUUID();

    @Mock
    private CustomerServiceClient customerServiceClient;
    @Mock
    private Jwt jwt;

    private CurrentCustomerIdentityResolver resolver;

    @BeforeEach
    void setUp() {
        resolver = new CurrentCustomerIdentityResolver(customerServiceClient, new IntegrationCallRetrier());
        when(jwt.getClaimAsString("userId")).thenReturn(USER_ID.toString());
    }

    @Test
    void resolvesTheAuthenticatedUserAndActiveCustomerProfile() {
        when(jwt.getTokenValue()).thenReturn("caller-token");
        when(customerServiceClient.getCurrentCustomer("Bearer caller-token"))
                .thenReturn(ApiResponse.success(new CustomerContract(CUSTOMER_ID, true)));

        CurrentCustomerIdentity identity = resolver.resolve(jwt);

        assertEquals(new CurrentCustomerIdentity(USER_ID, CUSTOMER_ID), identity);
    }

    @Test
    void rejectsInactiveCustomerProfile() {
        when(jwt.getTokenValue()).thenReturn("caller-token");
        when(customerServiceClient.getCurrentCustomer("Bearer caller-token"))
                .thenReturn(ApiResponse.success(new CustomerContract(CUSTOMER_ID, false)));

        ApiException exception = assertThrows(ApiException.class, () -> resolver.resolve(jwt));

        assertEquals(ErrorCode.UNAUTHORIZED, exception.getErrorCode());
    }

    @Test
    void rejectsTokenWithoutValidUserIdBeforeCallingCustomerService() {
        when(jwt.getClaimAsString("userId")).thenReturn("invalid-id");

        ApiException exception = assertThrows(ApiException.class, () -> resolver.resolve(jwt));

        assertEquals(ErrorCode.UNAUTHORIZED, exception.getErrorCode());
        verify(customerServiceClient, never()).getCurrentCustomer(org.mockito.ArgumentMatchers.any());
    }
}
