package com.example.inventory_service.controller;

import com.example.inventory_service.dto.request.PartPricingRequest;
import com.example.inventory_service.dto.request.StockAvailabilityRequest;
import com.example.inventory_service.service.PartService;
import com.example.inventory_service.service.PartSyncService;
import com.example.inventory_service.service.StockService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.AuthenticationCredentialsNotFoundException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.context.junit.jupiter.SpringJUnitConfig;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.reset;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;

/**
 * Test các {@code @PreAuthorize} thực tế bằng Spring proxy, không cần DB hoặc JWT secret.
 *
 * <p>Kiểm tra riêng hai API đồng bộ (PLAN.md §4.3): chúng chỉ đọc catalog
 * nên dùng {@code PART_READ}, không cần quyền ghi kho.
 */
@SpringJUnitConfig(PartControllerSecurityTest.TestConfig.class)
class PartControllerSecurityTest {

    @Autowired
    private PartController controller;
    @Autowired
    private PartSyncService partSyncService;

    @BeforeEach
    void setUp() {
        reset(partSyncService);
        SecurityContextHolder.clearContext();
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    @ParameterizedTest
    @ValueSource(strings = {"checkAvailability", "pricing"})
    void permitsPartReadAuthorityForSyncEndpoints(String operation) {
        authenticate("PART_READ");

        invoke(operation);

        switch (operation) {
            case "checkAvailability" -> verify(partSyncService).checkAvailability(any());
            case "pricing" -> verify(partSyncService).getPricing(any());
            default -> throw new IllegalArgumentException(operation);
        }
    }

    @ParameterizedTest
    @ValueSource(strings = {"checkAvailability", "pricing"})
    void deniesAuthorityWithoutPartReadForSyncEndpoints(String operation) {
        authenticate("STOCK_WRITE");

        assertThatThrownBy(() -> invoke(operation)).isInstanceOf(AccessDeniedException.class);
        verifyNoInteractions(partSyncService);
    }

    @Test
    void rejectsMissingAuthentication() {
        assertThatThrownBy(() -> controller.checkAvailability(null))
                .isInstanceOf(AuthenticationCredentialsNotFoundException.class);
        verifyNoInteractions(partSyncService);
    }

    private void authenticate(String authority) {
        SecurityContextHolder.getContext().setAuthentication(
                UsernamePasswordAuthenticationToken.authenticated("tester", null,
                        List.of(new SimpleGrantedAuthority(authority))));
    }

    private void invoke(String operation) {
        switch (operation) {
            case "checkAvailability" -> controller.checkAvailability(
                    new StockAvailabilityRequest(List.of()));
            case "pricing" -> controller.pricing(new PartPricingRequest(List.of()));
            default -> throw new IllegalArgumentException(operation);
        }
    }

    @Configuration(proxyBeanMethods = false)
    @EnableMethodSecurity
    static class TestConfig {
        @Bean
        PartService partService() {
            return mock(PartService.class);
        }

        @Bean
        StockService stockService() {
            return mock(StockService.class);
        }

        @Bean
        PartSyncService partSyncService() {
            return mock(PartSyncService.class);
        }

        @Bean
        PartController partController(PartService partService,
                                     StockService stockService,
                                     PartSyncService partSyncService) {
            return new PartController(partService, stockService, partSyncService);
        }
    }
}
