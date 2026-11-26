package com.example.work_order_service.controller;

import com.example.work_order_service.dto.response.HomepageReviewSummaryResponse;
import com.example.work_order_service.service.WorkOrderFeedbackService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.AuthenticationException;
import org.springframework.test.context.junit.jupiter.SpringJUnitConfig;

import java.math.BigDecimal;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@SpringJUnitConfig(WorkOrderFeedbackControllerSecurityTest.TestConfig.class)
class WorkOrderFeedbackControllerSecurityTest {

    @Autowired
    private WorkOrderFeedbackController controller;
    @Autowired
    private WorkOrderFeedbackService feedbackService;

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void homepageSummaryIsPublic() {
        var summary = new HomepageReviewSummaryResponse(BigDecimal.valueOf(4.5), 2, List.of());
        when(feedbackService.getHomepageSummary(5)).thenReturn(summary);

        controller.getHomepageSummary(5);

        verify(feedbackService).getHomepageSummary(5);
    }

    @Test
    void customerEligibilityRequiresAuthentication() {
        assertThrows(AuthenticationException.class,
                () -> controller.getEligibleWorkOrders(null, 0, 20));

        verify(feedbackService, never()).getEligibleWorkOrders(null, 0, 20);
    }

    @Configuration(proxyBeanMethods = false)
    @EnableMethodSecurity
    static class TestConfig {
        @Bean
        WorkOrderFeedbackService feedbackService() {
            return mock(WorkOrderFeedbackService.class);
        }

        @Bean
        WorkOrderFeedbackController feedbackController(WorkOrderFeedbackService feedbackService) {
            return new WorkOrderFeedbackController(feedbackService);
        }
    }
}
