package com.example.notification_service.service;

import com.example.notification_service.entity.Notification;
import com.example.notification_service.entity.NotificationDelivery;
import com.example.notification_service.entity.NotificationTemplate;
import com.example.notification_service.enums.DeliveryStatus;
import com.example.notification_service.enums.NotificationCategory;
import com.example.notification_service.enums.NotificationChannel;
import com.example.notification_service.enums.RecipientType;
import com.example.notification_service.repository.NotificationDeliveryRepository;
import com.example.notification_service.repository.NotificationTemplateRepository;
import com.example.notification_service.repository.ProcessedEventRepository;
import com.fasterxml.jackson.databind.JsonNode;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@Service
public class NotificationEventProcessor {

    private final ProcessedEventRepository processedEventRepository;
    private final NotificationTemplateRepository templateRepository;
    private final NotificationDeliveryRepository deliveryRepository;
    private final NotificationApplicationService applicationService;
    private final RecipientResolverService recipientResolver;
    private final TemplateRenderer templateRenderer;

    public NotificationEventProcessor(
            ProcessedEventRepository processedEventRepository,
            NotificationTemplateRepository templateRepository,
            NotificationDeliveryRepository deliveryRepository,
            NotificationApplicationService applicationService,
            RecipientResolverService recipientResolver,
            TemplateRenderer templateRenderer
    ) {
        this.processedEventRepository = processedEventRepository;
        this.templateRepository = templateRepository;
        this.deliveryRepository = deliveryRepository;
        this.applicationService = applicationService;
        this.recipientResolver = recipientResolver;
        this.templateRenderer = templateRenderer;
    }

    @Transactional
    public boolean process(
            JsonNode event,
            String topic,
            String eventType,
            UUID eventId,
            UUID aggregateId,
            String templateCode,
            RecipientType recipientType,
            UUID recipientId,
            UUID vehicleId,
            NotificationCategory category,
            String referenceType,
            UUID referenceId,
            Map<String, ?> extraVariables
    ) {
        if (eventId == null) {
            throw new IllegalArgumentException("Kafka event must contain eventId");
        }
        if (processedEventRepository.insertIgnore(
                eventId.toString(),
                topic,
                eventType,
                aggregateId == null ? null : aggregateId.toString()) == 0) {
            return false;
        }

        ResolvedRecipient recipient = recipientResolver.resolve(
                recipientType, recipientId, vehicleId);
        if (recipient.userId() == null) {
            throw new IllegalStateException(
                    "Resolved recipient has no userId for " + recipientId);
        }

        Map<String, Object> variables = new HashMap<>(recipient.toTemplateVariables());
        if (extraVariables != null) {
            variables.putAll(extraVariables);
        }

        NotificationTemplate inAppTemplate = templateRepository
                .findByCodeAndChannelAndIsActiveTrue(templateCode, NotificationChannel.IN_APP)
                .orElse(null);
        Notification savedNotification = null;
        if (inAppTemplate != null) {
            Notification notification = Notification.builder()
                    .recipientId(recipient.userId())
                    .recipientType(recipientType)
                    .category(category)
                    .title(templateRenderer.render(
                            inAppTemplate.getSubjectTemplate() == null
                                    ? templateCode
                                    : inAppTemplate.getSubjectTemplate(),
                            variables))
                    .content(templateRenderer.render(inAppTemplate.getBodyTemplate(), variables))
                    .referenceType(referenceType)
                    .referenceId(referenceId)
                    .isRead(false)
                    .build();
            savedNotification = applicationService.create(notification);
        }

        NotificationTemplate emailTemplate = templateRepository
                .findByCodeAndChannelAndIsActiveTrue(templateCode, NotificationChannel.EMAIL)
                .orElse(null);
        if (emailTemplate != null && recipient.email() != null && !recipient.email().isBlank()) {
            deliveryRepository.save(NotificationDelivery.builder()
                    .notification(savedNotification)
                    .eventId(eventId)
                    .templateCode(templateCode)
                    .channel(NotificationChannel.EMAIL)
                    .recipientAddress(recipient.email())
                    .subject(templateRenderer.render(
                            emailTemplate.getSubjectTemplate() == null
                                    ? templateCode
                                    : emailTemplate.getSubjectTemplate(),
                            variables))
                    .body(templateRenderer.renderHtml(emailTemplate.getBodyTemplate(), variables))
                    .status(DeliveryStatus.PENDING)
                    .retryCount(0)
                    .nextRetryAt(Instant.now())
                    .build());
        }
        return true;
    }
}
