package com.example.work_order_service.service;

import com.example.work_order_service.dto.request.CreateWorkOrderFeedbackRequest;
import com.example.work_order_service.entity.WorkOrder;
import com.example.work_order_service.entity.WorkOrderFeedback;
import com.example.work_order_service.enums.WorkOrderStatus;
import com.example.work_order_service.exception.ApiException;
import com.example.work_order_service.exception.ErrorCode;
import com.example.work_order_service.integration.WorkOrderIntegrationService;
import com.example.work_order_service.integration.contract.CustomerIdentityContract;
import com.example.work_order_service.repository.CompletedServiceLineProjection;
import com.example.work_order_service.repository.FeedbackAggregateProjection;
import com.example.work_order_service.repository.WorkOrderFeedbackRepository;
import com.example.work_order_service.repository.WorkOrderRepository;
import com.example.work_order_service.repository.WorkOrderServiceLineRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.security.oauth2.jwt.Jwt;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class WorkOrderFeedbackServiceImplTest {

    private static final UUID USER_ID = UUID.randomUUID();
    private static final UUID CUSTOMER_ID = UUID.randomUUID();
    private static final UUID WORK_ORDER_ID = UUID.randomUUID();

    @Mock
    private WorkOrderRepository workOrderRepository;
    @Mock
    private WorkOrderFeedbackRepository feedbackRepository;
    @Mock
    private WorkOrderServiceLineRepository serviceLineRepository;
    @Mock
    private WorkOrderIntegrationService integrationService;

    private WorkOrderFeedbackServiceImpl service;

    @BeforeEach
    void setUp() {
        service = new WorkOrderFeedbackServiceImpl(
                workOrderRepository, feedbackRepository, serviceLineRepository, integrationService);
        lenient().when(integrationService.getCustomerByUserId(USER_ID))
                .thenReturn(new CustomerIdentityContract(CUSTOMER_ID, true));
    }

    @Test
    void eligibleWorkOrdersUseCustomerFromJwtAndClosedStatus() {
        WorkOrder workOrder = workOrder(WorkOrderStatus.CLOSED);
        PageRequest pageable = PageRequest.of(0, 20);
        when(workOrderRepository.findFeedbackEligible(CUSTOMER_ID, WorkOrderStatus.CLOSED, pageable))
                .thenReturn(new PageImpl<>(List.of(workOrder), pageable, 1));

        var result = service.getEligibleWorkOrders(jwt(), 0, 20);

        assertThat(result.items()).extracting("workOrderId").containsExactly(WORK_ORDER_ID);
        verify(workOrderRepository).findFeedbackEligible(CUSTOMER_ID, WorkOrderStatus.CLOSED, pageable);
    }

    @Test
    void submitTrimsOptionalCommentAndPersistsDerivedCustomerId() {
        WorkOrder workOrder = workOrder(WorkOrderStatus.CLOSED);
        when(workOrderRepository.findByIdForUpdate(WORK_ORDER_ID)).thenReturn(Optional.of(workOrder));
        when(feedbackRepository.existsByWorkOrder_Id(WORK_ORDER_ID)).thenReturn(false);
        when(feedbackRepository.saveAndFlush(any(WorkOrderFeedback.class))).thenAnswer(invocation -> {
            WorkOrderFeedback saved = invocation.getArgument(0);
            saved.setId(UUID.randomUUID());
            saved.setCreatedAt(Instant.now());
            return saved;
        });

        var result = service.submit(WORK_ORDER_ID, new CreateWorkOrderFeedbackRequest(5, "  Great service  "), jwt());

        ArgumentCaptor<WorkOrderFeedback> feedback =
                ArgumentCaptor.forClass(WorkOrderFeedback.class);
        verify(feedbackRepository).saveAndFlush(feedback.capture());
        assertEquals(CUSTOMER_ID, feedback.getValue().getCustomerId());
        assertEquals("Great service", feedback.getValue().getComment());
        assertEquals(5, result.rating());
        assertEquals(WORK_ORDER_ID, result.workOrderId());
    }

    @Test
    void submitRejectsWorkOrderOwnedByAnotherCustomer() {
        WorkOrder workOrder = workOrder(WorkOrderStatus.CLOSED);
        workOrder.setCustomerId(UUID.randomUUID());
        when(workOrderRepository.findByIdForUpdate(WORK_ORDER_ID)).thenReturn(Optional.of(workOrder));

        ApiException exception = assertThrows(ApiException.class,
                () -> service.submit(WORK_ORDER_ID, new CreateWorkOrderFeedbackRequest(4, null), jwt()));

        assertEquals(ErrorCode.UNAUTHORIZED, exception.getErrorCode());
        verify(feedbackRepository, never()).saveAndFlush(any());
    }

    @Test
    void submitRejectsWorkOrderBeforeClosed() {
        when(workOrderRepository.findByIdForUpdate(WORK_ORDER_ID))
                .thenReturn(Optional.of(workOrder(WorkOrderStatus.PENDING_PAYMENT)));

        ApiException exception = assertThrows(ApiException.class,
                () -> service.submit(WORK_ORDER_ID, new CreateWorkOrderFeedbackRequest(4, null), jwt()));

        assertEquals(ErrorCode.INVALID_WORK_ORDER_STATUS_TRANSITION, exception.getErrorCode());
        verify(feedbackRepository, never()).saveAndFlush(any());
    }

    @Test
    void submitRejectsSecondReviewForWorkOrder() {
        when(workOrderRepository.findByIdForUpdate(WORK_ORDER_ID))
                .thenReturn(Optional.of(workOrder(WorkOrderStatus.CLOSED)));
        when(feedbackRepository.existsByWorkOrder_Id(WORK_ORDER_ID)).thenReturn(true);

        ApiException exception = assertThrows(ApiException.class,
                () -> service.submit(WORK_ORDER_ID, new CreateWorkOrderFeedbackRequest(4, null), jwt()));

        assertEquals(ErrorCode.WORK_ORDER_FEEDBACK_ALREADY_EXISTS, exception.getErrorCode());
        verify(feedbackRepository, never()).saveAndFlush(any());
    }

    @Test
    void unresolvedUserIdInJwtIsRejectedWithoutResolvingCustomer() {
        Jwt invalidJwt = Jwt.withTokenValue("token").header("alg", "none")
                .claim("userId", "not-a-uuid").build();

        ApiException exception = assertThrows(ApiException.class,
                () -> service.getEligibleWorkOrders(invalidJwt, 0, 20));

        assertEquals(ErrorCode.UNAUTHENTICATED, exception.getErrorCode());
        verify(integrationService, never()).getCustomerByUserId(any());
    }

    @Test
    void homepageSummaryIncludesCompletedServiceNamesAndAggregatedScore() {
        Instant createdAt = Instant.parse("2026-01-15T08:30:00Z");
        WorkOrderFeedback feedback = WorkOrderFeedback.builder()
                .id(UUID.randomUUID())
                .workOrder(workOrder(WorkOrderStatus.CLOSED))
                .rating(5)
                .comment("Great")
                .createdAt(createdAt)
                .build();
        PageRequest pageable = PageRequest.of(0, 5);
        when(feedbackRepository.summarize()).thenReturn(new FeedbackAggregateProjection() {
            @Override
            public Long getRatingSum() {
                return 9L;
            }

            @Override
            public Long getReviewCount() {
                return 2L;
            }
        });
        when(feedbackRepository.findAllByOrderByCreatedAtDescIdDesc(pageable))
                .thenReturn(new PageImpl<>(List.of(feedback), pageable, 1));
        when(serviceLineRepository.findCompletedSnapshotsByWorkOrderIds(List.of(WORK_ORDER_ID)))
                .thenReturn(List.of(new CompletedServiceLineProjection() {
                    @Override
                    public UUID getWorkOrderId() {
                        return WORK_ORDER_ID;
                    }

                    @Override
                    public String getSnapshotName() {
                        return "Brake repair";
                    }
                }));

        var result = service.getHomepageSummary(5);

        assertEquals("4.50", result.averageRating().toPlainString());
        assertEquals(2, result.reviewCount());
        assertEquals(List.of("Brake repair"), result.recentReviews().get(0).completedServices());
        assertEquals("Great", result.recentReviews().get(0).comment());
    }

    private Jwt jwt() {
        return Jwt.withTokenValue("token").header("alg", "none")
                .claim("userId", USER_ID.toString()).build();
    }

    private WorkOrder workOrder(WorkOrderStatus status) {
        return WorkOrder.builder()
                .id(WORK_ORDER_ID)
                .code("WO-1")
                .customerId(CUSTOMER_ID)
                .status(status)
                .build();
    }
}
