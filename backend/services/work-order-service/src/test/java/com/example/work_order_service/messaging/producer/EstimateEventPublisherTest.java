package com.example.work_order_service.messaging.producer;

import com.example.work_order_service.enums.EstimateStatus;
import com.example.work_order_service.messaging.event.EstimateApprovedEvent;
import com.example.work_order_service.messaging.event.EstimatePendingApprovalEvent;
import com.example.work_order_service.service.OutboxEventService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.Instant;
import java.util.UUID;

import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class EstimateEventPublisherTest {

    @Mock
    private OutboxEventService outboxEventService;

    private EstimateEventPublisher publisher;

    @BeforeEach
    void setUp() {
        publisher = new EstimateEventPublisher(outboxEventService);
        ReflectionTestUtils.setField(
                publisher, "pendingApprovalTopic", "work-order.estimate-pending-approval");
        ReflectionTestUtils.setField(publisher, "approvedTopic", "work-order.estimate-approved");
    }

    @Test
    void addsPendingApprovalEventToWorkOrderOutbox() {
        UUID eventId = UUID.randomUUID();
        UUID workOrderId = UUID.randomUUID();
        EstimatePendingApprovalEvent event = new EstimatePendingApprovalEvent(
                eventId, UUID.randomUUID(), "EST-1", workOrderId, "WO-1",
                UUID.randomUUID(), UUID.randomUUID(), Instant.now());

        publisher.publishPendingApproval(event);

        verify(outboxEventService).add(
                "WORK_ORDER", workOrderId, "work-order.estimate-pending-approval",
                "EstimatePendingApprovalEvent", eventId, event);
    }

    @Test
    void addsApprovalEventToWorkOrderOutbox() {
        UUID eventId = UUID.randomUUID();
        UUID workOrderId = UUID.randomUUID();
        EstimateApprovedEvent event = new EstimateApprovedEvent(
                eventId, UUID.randomUUID(), "EST-1", workOrderId, "WO-1",
                UUID.randomUUID(), EstimateStatus.PARTIALLY_APPROVED, Instant.now());

        publisher.publishApproved(event);

        verify(outboxEventService).add(
                "WORK_ORDER", workOrderId, "work-order.estimate-approved",
                "EstimateApprovedEvent", eventId, event);
    }
}
