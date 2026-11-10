package com.example.work_order_service.controller;

import com.example.work_order_service.dto.request.PartQuantityRequest;
import com.example.work_order_service.service.WorkOrderPartTransaction;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.test.context.junit.jupiter.SpringJUnitConfig;

import java.util.List;
import java.util.UUID;

import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.reset;
import static org.mockito.Mockito.verify;

@SpringJUnitConfig(WorkOrderPartControllerSecurityTest.TestConfig.class)
class WorkOrderPartControllerSecurityTest {

    @Autowired
    private WorkOrderPartController controller;
    @Autowired
    private WorkOrderPartTransaction transaction;

    @BeforeEach
    void setUp() {
        reset(transaction);
        SecurityContextHolder.getContext().setAuthentication(
                UsernamePasswordAuthenticationToken.authenticated("user", null, List.of()));
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void issueAndReleaseDoNotRequirePartPermissions() {
        UUID workOrderId = UUID.randomUUID();
        UUID partLineId = UUID.randomUUID();
        Jwt jwt = Jwt.withTokenValue("token")
                .header("alg", "none")
                .claim("userId", UUID.randomUUID().toString())
                .build();
        PartQuantityRequest request = new PartQuantityRequest(2);

        controller.issue(workOrderId, partLineId, request, jwt);
        controller.release(workOrderId, partLineId, request, jwt);

        verify(transaction).issue(workOrderId, partLineId, 2, jwt);
        verify(transaction).release(workOrderId, partLineId, 2, jwt);
    }

    @Configuration(proxyBeanMethods = false)
    @EnableMethodSecurity
    static class TestConfig {
        @Bean
        WorkOrderPartTransaction workOrderPartTransaction() {
            return mock(WorkOrderPartTransaction.class);
        }

        @Bean
        WorkOrderPartController workOrderPartController(WorkOrderPartTransaction transaction) {
            return new WorkOrderPartController(transaction);
        }
    }
}
