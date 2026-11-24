package com.example.notification_service.messaging.listener;

import com.example.notification_service.enums.NotificationCategory;
import com.example.notification_service.enums.RecipientType;
import com.example.notification_service.service.NotificationEventProcessor;
import com.fasterxml.jackson.databind.JsonNode;
import lombok.RequiredArgsConstructor;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@Component
@RequiredArgsConstructor
public class DomainEventNotificationListener {

    private final NotificationEventProcessor processor;

    @KafkaListener(topics = "${app.kafka.topics.work-order-completed:work-order-completed}",
            properties = "spring.json.value.default.type=com.fasterxml.jackson.databind.JsonNode")
    public void onWorkOrderCompleted(JsonNode event) {
        processCustomer(
                event, "work-order-completed", "WorkOrderCompletedEvent",
                "workOrderId", "WORK_ORDER_COMPLETED", "WORK_ORDER",
                "workOrderCode");
    }

    @KafkaListener(topics = "${app.kafka.topics.payment-completed:billing.payment-completed}",
            properties = "spring.json.value.default.type=com.fasterxml.jackson.databind.JsonNode")
    public void onPaymentCompleted(JsonNode event) {
        UUID eventId = uuid(event, "eventId");
        UUID invoiceId = uuid(event, "invoiceId");
        Map<String, Object> variables = new HashMap<>();
        variables.put("invoiceCode", text(event, "invoiceCode", invoiceId));
        variables.put("amount", text(event, "paidAmount", "0"));

        processor.process(
                event,
                "billing.payment-completed",
                "PaymentCompletedEvent",
                eventId,
                invoiceId,
                "PAYMENT_RECEIPT",
                RecipientType.CUSTOMER,
                uuid(event, "customerId"),
                uuid(event, "vehicleId"),
                NotificationCategory.BILLING,
                "INVOICE",
                invoiceId,
                variables
        );
    }

    @KafkaListener(topics = "${app.kafka.topics.parts-reservation-failed:parts-reservation-failed}",
            properties = "spring.json.value.default.type=com.fasterxml.jackson.databind.JsonNode")
    public void onPartsReservationFailed(JsonNode event) {
        UUID eventId = uuid(event, "eventId");
        UUID workOrderId = uuid(event, "workOrderId");
        UUID requestedBy = uuid(event, "requestedBy");
        Map<String, Object> variables = new HashMap<>();
        variables.put("workOrderCode", text(event, "workOrderCode", workOrderId));
        processor.process(
                event,
                "parts-reservation-failed",
                "PartsReservationFailedEvent",
                eventId,
                workOrderId,
                "PART_SHORTAGE_ALERT",
                RecipientType.STAFF,
                requestedBy,
                null,
                NotificationCategory.INVENTORY,
                "WORK_ORDER",
                workOrderId,
                variables
        );
    }

    @KafkaListener(topics = "${app.kafka.topics.booking-created:booking.created}",
            properties = "spring.json.value.default.type=com.fasterxml.jackson.databind.JsonNode")
    public void onBookingCreated(JsonNode event) {
        processBooking(event, "booking.created", "BookingCreatedEvent",
                "bookingId", "BOOKING_CREATED");
    }

    @KafkaListener(topics = "${app.kafka.topics.booking-confirmed:booking.confirmed}",
            properties = "spring.json.value.default.type=com.fasterxml.jackson.databind.JsonNode")
    public void onBookingConfirmed(JsonNode event) {
        processBooking(event, "booking.confirmed", "BookingConfirmedEvent",
                "bookingId", "BOOKING_CONFIRMED");
    }

    @KafkaListener(topics = "${app.kafka.topics.booking-canceled:booking.canceled}",
            properties = "spring.json.value.default.type=com.fasterxml.jackson.databind.JsonNode")
    public void onBookingCanceled(JsonNode event) {
        processBooking(event, "booking.canceled", "BookingCanceledEvent",
                "bookingId", "BOOKING_CANCELED");
    }

    @KafkaListener(topics = "${app.kafka.topics.estimate-pending-approval:work-order.estimate-pending-approval}",
            properties = "spring.json.value.default.type=com.fasterxml.jackson.databind.JsonNode")
    public void onEstimatePendingApproval(JsonNode event) {
        UUID eventId = uuid(event, "eventId");
        UUID workOrderId = uuid(event, "workOrderId");
        UUID customerId = uuid(event, "customerId");
        Map<String, Object> variables = new HashMap<>();
        variables.put("workOrderCode", text(event, "workOrderCode", workOrderId));
        processor.process(
                event,
                "work-order.estimate-pending-approval",
                "EstimatePendingApprovalEvent",
                eventId,
                workOrderId,
                "ESTIMATE_READY",
                RecipientType.CUSTOMER,
                customerId,
                uuid(event, "vehicleId"),
                NotificationCategory.WORK_ORDER,
                "WORK_ORDER",
                workOrderId,
                variables
        );
    }

    @KafkaListener(topics = "${app.kafka.topics.estimate-approved:work-order.estimate-approved}",
            properties = "spring.json.value.default.type=com.fasterxml.jackson.databind.JsonNode")
    public void onEstimateApproved(JsonNode event) {
        UUID eventId = uuid(event, "eventId");
        UUID workOrderId = uuid(event, "workOrderId");
        UUID advisorId = uuid(event, "advisorId");
        Map<String, Object> variables = new HashMap<>();
        variables.put("workOrderCode", text(event, "workOrderCode", workOrderId));
        processor.process(
                event,
                "work-order.estimate-approved",
                "EstimateApprovedEvent",
                eventId,
                workOrderId,
                "ESTIMATE_APPROVED",
                RecipientType.STAFF,
                advisorId,
                null,
                NotificationCategory.WORK_ORDER,
                "WORK_ORDER",
                workOrderId,
                variables
        );
    }

    @KafkaListener(topics = "${app.kafka.topics.low-stock-alert:inventory.low-stock-alert}",
            properties = "spring.json.value.default.type=com.fasterxml.jackson.databind.JsonNode")
    public void onLowStockAlert(JsonNode event) {
        UUID eventId = uuid(event, "eventId");
        UUID partId = uuid(event, "partId");
        UUID recipientId = uuid(event, "recipientId");
        Map<String, Object> variables = new HashMap<>();
        variables.put("partName", text(event, "partName", "Phụ tùng"));
        processor.process(
                event,
                "inventory.low-stock-alert",
                "LowStockAlertEvent",
                eventId,
                partId,
                "LOW_STOCK_ALERT",
                RecipientType.STAFF,
                recipientId,
                null,
                NotificationCategory.INVENTORY,
                "PART",
                partId,
                variables
        );
    }

    private void processBooking(
            JsonNode event,
            String topic,
            String eventType,
            String aggregateField,
            String templateCode
    ) {
        UUID eventId = uuid(event, "eventId");
        UUID bookingId = uuid(event, aggregateField);
        UUID customerId = uuid(event, "customerId");
        UUID vehicleId = uuid(event, "vehicleId");
        Map<String, Object> variables = new HashMap<>();
        variables.put("bookingCode", text(event, "bookingCode", bookingId));
        variables.put("appointmentTime", text(event, "appointmentTime", ""));
        processor.process(
                event,
                topic,
                eventType,
                eventId,
                bookingId,
                templateCode,
                RecipientType.CUSTOMER,
                customerId,
                vehicleId,
                NotificationCategory.BOOKING,
                "BOOKING",
                bookingId,
                variables
        );
    }

    private void processCustomer(
            JsonNode event,
            String topic,
            String eventType,
            String aggregateField,
            String templateCode,
            String referenceType,
            String codeVariable
    ) {
        UUID eventId = uuid(event, "eventId");
        UUID aggregateId = uuid(event, aggregateField);
        UUID customerId = uuid(event, "customerId");
        UUID vehicleId = uuid(event, "vehicleId");
        Map<String, Object> variables = new HashMap<>();
        variables.put(codeVariable, text(event, codeVariable, aggregateId));
        if (event.has("totalAmount")) {
            variables.put("amount", event.get("totalAmount").asText());
        }
        processor.process(
                event,
                topic,
                eventType,
                eventId,
                aggregateId,
                templateCode,
                RecipientType.CUSTOMER,
                customerId,
                vehicleId,
                NotificationCategory.WORK_ORDER,
                referenceType,
                aggregateId,
                variables
        );
    }

    private UUID uuid(JsonNode event, String field) {
        JsonNode value = event.get(field);
        if (value == null || value.isNull() || value.asText().isBlank()) {
            return null;
        }
        return UUID.fromString(value.asText());
    }

    private String text(JsonNode event, String field, UUID fallback) {
        JsonNode value = event.get(field);
        return value == null || value.isNull()
                ? (fallback == null ? "" : fallback.toString())
                : value.asText();
    }

    private String text(JsonNode event, String field, String fallback) {
        JsonNode value = event.get(field);
        return value == null || value.isNull() ? fallback : value.asText();
    }
}
