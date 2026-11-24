package com.example.work_order_service.messaging.producer;

import com.example.work_order_service.messaging.event.EstimateApprovedEvent;
import com.example.work_order_service.messaging.event.EstimatePendingApprovalEvent;
import com.example.work_order_service.service.OutboxEventService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class EstimateEventPublisher {

    private final OutboxEventService outboxEventService;

    @Value("${app.kafka.topics.estimate-pending-approval:work-order.estimate-pending-approval}")
    private String pendingApprovalTopic;

    @Value("${app.kafka.topics.estimate-approved:work-order.estimate-approved}")
    private String approvedTopic;

    public void publishPendingApproval(EstimatePendingApprovalEvent event) {
        outboxEventService.add(
                "WORK_ORDER",
                event.workOrderId(),
                pendingApprovalTopic,
                EstimatePendingApprovalEvent.class.getSimpleName(),
                event.eventId(),
                event);
    }

    public void publishApproved(EstimateApprovedEvent event) {
        outboxEventService.add(
                "WORK_ORDER",
                event.workOrderId(),
                approvedTopic,
                EstimateApprovedEvent.class.getSimpleName(),
                event.eventId(),
                event);
    }
}
