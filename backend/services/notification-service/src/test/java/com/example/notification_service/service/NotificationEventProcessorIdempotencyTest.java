package com.example.notification_service.service;

import com.example.notification_service.entity.Notification;
import com.example.notification_service.entity.NotificationTemplate;
import com.example.notification_service.enums.NotificationChannel;
import com.example.notification_service.enums.RecipientType;
import com.example.notification_service.messaging.listener.DomainEventNotificationListener;
import com.example.notification_service.repository.NotificationDeliveryRepository;
import com.example.notification_service.repository.NotificationTemplateRepository;
import com.example.notification_service.repository.ProcessedEventRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;

import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class NotificationEventProcessorIdempotencyTest {

    @Mock
    private ProcessedEventRepository processedEventRepository;

    @Mock
    private NotificationTemplateRepository templateRepository;

    @Mock
    private NotificationDeliveryRepository deliveryRepository;

    @Mock
    private NotificationApplicationService applicationService;

    @Mock
    private RecipientResolverService recipientResolver;

    private DomainEventNotificationListener listener;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        NotificationEventProcessor processor = new NotificationEventProcessor(
                processedEventRepository,
                templateRepository,
                deliveryRepository,
                applicationService,
                recipientResolver,
                new TemplateRenderer()
        );
        listener = new DomainEventNotificationListener(processor);
    }

    @Test
    void duplicatePaymentCompletedEventCreatesOnlyOneInAppNotificationAndEmailDelivery()
            throws Exception {
        UUID eventId = UUID.randomUUID();
        UUID invoiceId = UUID.randomUUID();
        UUID customerId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();

        when(processedEventRepository.insertIgnore(
                anyString(), anyString(), anyString(), anyString()))
                .thenReturn(1, 0, 0);
        when(recipientResolver.resolve(RecipientType.CUSTOMER, customerId, null))
                .thenReturn(new ResolvedRecipient(
                        customerId, userId, RecipientType.CUSTOMER,
                        "Customer", "customer@example.com", null, null));
        when(templateRepository.findByCodeAndChannelAndIsActiveTrue(
                "PAYMENT_RECEIPT", NotificationChannel.IN_APP))
                .thenReturn(Optional.of(template(NotificationChannel.IN_APP)));
        when(templateRepository.findByCodeAndChannelAndIsActiveTrue(
                "PAYMENT_RECEIPT", NotificationChannel.EMAIL))
                .thenReturn(Optional.of(template(NotificationChannel.EMAIL)));
        when(applicationService.create(any(Notification.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        var event = new ObjectMapper().createObjectNode()
                .put("eventId", eventId.toString())
                .put("invoiceId", invoiceId.toString())
                .put("customerId", customerId.toString())
                .put("paidAmount", "120.00");

        listener.onPaymentCompleted(event);
        listener.onPaymentCompleted(event);
        listener.onPaymentCompleted(event);

        verify(processedEventRepository, times(3))
                .insertIgnore(anyString(), eq("billing.payment-completed"),
                        eq("PaymentCompletedEvent"), eq(invoiceId.toString()));
        verify(applicationService, times(1)).create(any(Notification.class));
        verify(deliveryRepository, times(1)).save(any());
    }

    @Test
    void queuesEmailWhenInAppTemplateIsDisabled() {
        UUID eventId = UUID.randomUUID();
        UUID invoiceId = UUID.randomUUID();
        UUID customerId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();

        when(processedEventRepository.insertIgnore(
                anyString(), anyString(), anyString(), anyString())).thenReturn(1);
        when(recipientResolver.resolve(RecipientType.CUSTOMER, customerId, null))
                .thenReturn(new ResolvedRecipient(
                        customerId, userId, RecipientType.CUSTOMER,
                        "Customer", "customer@example.com", null, null));
        when(templateRepository.findByCodeAndChannelAndIsActiveTrue(
                "PAYMENT_RECEIPT", NotificationChannel.IN_APP))
                .thenReturn(Optional.empty());
        when(templateRepository.findByCodeAndChannelAndIsActiveTrue(
                "PAYMENT_RECEIPT", NotificationChannel.EMAIL))
                .thenReturn(Optional.of(template(NotificationChannel.EMAIL)));

        var event = new ObjectMapper().createObjectNode()
                .put("eventId", eventId.toString())
                .put("invoiceId", invoiceId.toString())
                .put("customerId", customerId.toString())
                .put("paidAmount", "120.00");

        listener.onPaymentCompleted(event);

        verify(applicationService, never()).create(any(Notification.class));
        verify(deliveryRepository).save(argThat(delivery ->
                delivery.getNotification() == null
                        && eventId.equals(delivery.getEventId())
                        && "customer@example.com".equals(delivery.getRecipientAddress())));
    }

    @Test
    void processesBookingCreatedPayloadAndUsesBookingIdAsDisplayCodeFallback() {
        UUID eventId = UUID.randomUUID();
        UUID bookingId = UUID.randomUUID();
        UUID customerId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();
        String appointmentTime = "2026-11-05T01:00:00Z";
        when(processedEventRepository.insertIgnore(
                anyString(), anyString(), anyString(), anyString())).thenReturn(1);
        when(recipientResolver.resolve(RecipientType.CUSTOMER, customerId, null))
                .thenReturn(new ResolvedRecipient(
                        customerId, userId, RecipientType.CUSTOMER, "Customer", null, null, null));
        when(templateRepository.findByCodeAndChannelAndIsActiveTrue(
                "BOOKING_CREATED", NotificationChannel.IN_APP))
                .thenReturn(Optional.of(template(
                        NotificationChannel.IN_APP,
                        "BOOKING_CREATED",
                        "Booking {{bookingCode}} at {{appointmentTime}}")));
        when(templateRepository.findByCodeAndChannelAndIsActiveTrue(
                "BOOKING_CREATED", NotificationChannel.EMAIL)).thenReturn(Optional.empty());
        when(applicationService.create(any(Notification.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));
        var event = new ObjectMapper().createObjectNode()
                .put("eventId", eventId.toString())
                .put("bookingId", bookingId.toString())
                .put("customerId", customerId.toString())
                .put("appointmentTime", appointmentTime);

        listener.onBookingCreated(event);

        ArgumentCaptor<Notification> notificationCaptor = ArgumentCaptor.forClass(Notification.class);
        verify(applicationService).create(notificationCaptor.capture());
        assertEquals("Booking " + bookingId + " at " + appointmentTime,
                notificationCaptor.getValue().getContent());
    }

    @Test
    void processesEstimateAndCompletedEventsWithDomainCodes() {
        UUID customerId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();
        UUID workOrderId = UUID.randomUUID();
        UUID advisorId = UUID.randomUUID();
        UUID advisorUserId = UUID.randomUUID();
        when(processedEventRepository.insertIgnore(
                anyString(), anyString(), anyString(), anyString())).thenReturn(1);
        when(recipientResolver.resolve(RecipientType.CUSTOMER, customerId, null))
                .thenReturn(new ResolvedRecipient(
                        customerId, userId, RecipientType.CUSTOMER, "Customer", null, null, null));
        when(recipientResolver.resolve(RecipientType.STAFF, advisorId, null))
                .thenReturn(new ResolvedRecipient(
                        advisorId, advisorUserId, RecipientType.STAFF, "Advisor", null, null, null));
        when(templateRepository.findByCodeAndChannelAndIsActiveTrue(
                "ESTIMATE_READY", NotificationChannel.IN_APP))
                .thenReturn(Optional.of(template(
                        NotificationChannel.IN_APP, "ESTIMATE_READY", "Estimate for {{workOrderCode}}")));
        when(templateRepository.findByCodeAndChannelAndIsActiveTrue(
                "ESTIMATE_APPROVED", NotificationChannel.IN_APP))
                .thenReturn(Optional.of(template(
                        NotificationChannel.IN_APP, "ESTIMATE_APPROVED", "Approved {{workOrderCode}}")));
        when(templateRepository.findByCodeAndChannelAndIsActiveTrue(
                "WORK_ORDER_COMPLETED", NotificationChannel.IN_APP))
                .thenReturn(Optional.of(template(
                        NotificationChannel.IN_APP, "WORK_ORDER_COMPLETED", "Completed {{workOrderCode}}")));
        when(templateRepository.findByCodeAndChannelAndIsActiveTrue(
                anyString(), eq(NotificationChannel.EMAIL))).thenReturn(Optional.empty());
        when(applicationService.create(any(Notification.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        ObjectMapper mapper = new ObjectMapper();
        var pendingEvent = mapper.createObjectNode()
                .put("eventId", UUID.randomUUID().toString())
                .put("workOrderId", workOrderId.toString())
                .put("workOrderCode", "WO-ESTIMATE")
                .put("customerId", customerId.toString());
        var approvedEvent = mapper.createObjectNode()
                .put("eventId", UUID.randomUUID().toString())
                .put("workOrderId", workOrderId.toString())
                .put("workOrderCode", "WO-APPROVED")
                .put("advisorId", advisorId.toString());
        var completedEvent = mapper.createObjectNode()
                .put("eventId", UUID.randomUUID().toString())
                .put("workOrderId", workOrderId.toString())
                .put("workOrderCode", "WO-COMPLETED")
                .put("customerId", customerId.toString());

        listener.onEstimatePendingApproval(pendingEvent);
        listener.onEstimateApproved(approvedEvent);
        listener.onWorkOrderCompleted(completedEvent);

        ArgumentCaptor<Notification> notificationCaptor = ArgumentCaptor.forClass(Notification.class);
        verify(applicationService, times(3)).create(notificationCaptor.capture());
        assertEquals(
                java.util.List.of("Estimate for WO-ESTIMATE", "Approved WO-APPROVED", "Completed WO-COMPLETED"),
                notificationCaptor.getAllValues().stream().map(Notification::getContent).toList());
    }

    private NotificationTemplate template(NotificationChannel channel) {
        return template(channel, "PAYMENT_RECEIPT", "Payment received");
    }

    private NotificationTemplate template(NotificationChannel channel, String code, String body) {
        return NotificationTemplate.builder()
                .code(code)
                .channel(channel)
                .subjectTemplate("Payment received")
                .bodyTemplate(body)
                .isActive(true)
                .build();
    }
}
