package com.example.notification_service.service;

import com.example.notification_service.dto.request.SendNotificationRequest;
import com.example.notification_service.dto.response.NotificationResponse;
import com.example.notification_service.entity.Notification;
import com.example.notification_service.entity.NotificationDelivery;
import com.example.notification_service.enums.DeliveryStatus;
import com.example.notification_service.enums.NotificationChannel;
import com.example.notification_service.exception.ApiException;
import com.example.notification_service.exception.ErrorCode;
import com.example.notification_service.repository.NotificationDeliveryRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;

@Service
public class NotificationSendServiceImpl implements NotificationSendService {

    private final NotificationDeliveryRepository deliveryRepository;
    private final NotificationApplicationService applicationService;

    public NotificationSendServiceImpl(
            NotificationDeliveryRepository deliveryRepository,
            NotificationApplicationService applicationService
    ) {
        this.deliveryRepository = deliveryRepository;
        this.applicationService = applicationService;
    }

    @Transactional
    @Override
    public NotificationResponse send(SendNotificationRequest request) {
        if (Boolean.TRUE.equals(request.sendEmail())
                && (request.emailAddress() == null || request.emailAddress().isBlank())) {
            throw new ApiException(ErrorCode.INVALID_REQUEST, "Email người nhận là bắt buộc");
        }

        Notification notification = Notification.builder()
                .recipientId(request.recipientId())
                .recipientType(request.recipientType())
                .category(request.category())
                .title(request.title())
                .content(request.content())
                .referenceType(request.referenceType())
                .referenceId(request.referenceId())
                .isRead(false)
                .build();
        notification = applicationService.create(notification);

        if (Boolean.TRUE.equals(request.sendEmail())) {
            deliveryRepository.save(NotificationDelivery.builder()
                    .notification(notification)
                    .channel(NotificationChannel.EMAIL)
                    .templateCode("MANUAL")
                    .recipientAddress(request.emailAddress().trim())
                    .subject(request.title())
                    .body(request.content())
                    .status(DeliveryStatus.PENDING)
                    .retryCount(0)
                    .nextRetryAt(Instant.now())
                    .build());
        }

        return new NotificationResponse(
                notification.getId(),
                notification.getCategory(),
                notification.getTitle(),
                notification.getContent(),
                notification.getReferenceType(),
                notification.getReferenceId(),
                notification.getIsRead(),
                notification.getReadAt(),
                notification.getCreatedAt()
        );
    }
}
