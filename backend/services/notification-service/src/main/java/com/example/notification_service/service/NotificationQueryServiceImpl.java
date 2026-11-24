package com.example.notification_service.service;

import com.example.notification_service.dto.response.NotificationResponse;
import com.example.notification_service.dto.response.PageResponse;
import com.example.notification_service.dto.response.UnreadCountResponse;
import com.example.notification_service.entity.Notification;
import com.example.notification_service.entity.NotificationTemplate;
import com.example.notification_service.dto.response.NotificationTemplateResponse;
import com.example.notification_service.dto.request.UpdateNotificationTemplateRequest;
import com.example.notification_service.enums.NotificationCategory;
import com.example.notification_service.exception.NotificationNotFoundException;
import com.example.notification_service.exception.NotificationTemplateNotFoundException;
import com.example.notification_service.repository.NotificationRepository;
import com.example.notification_service.repository.NotificationTemplateRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.time.Instant;
import java.util.UUID;

@Service
public class NotificationQueryServiceImpl implements NotificationQueryService {

    private final NotificationRepository notificationRepository;
    private final NotificationTemplateRepository templateRepository;
    private final SseEmitterRegistry sseEmitterRegistry;

    public NotificationQueryServiceImpl(
            NotificationRepository notificationRepository,
            NotificationTemplateRepository templateRepository,
            SseEmitterRegistry sseEmitterRegistry
    ) {
        this.notificationRepository = notificationRepository;
        this.templateRepository = templateRepository;
        this.sseEmitterRegistry = sseEmitterRegistry;
    }

    @Transactional(readOnly = true)
    @Override
    public PageResponse<NotificationResponse> list(
            UUID recipientId, Boolean isRead, NotificationCategory category, Pageable pageable) {
        Page<Notification> page;
        if (isRead != null && category != null) {
            page = notificationRepository.findByRecipientIdAndIsReadAndCategory(
                    recipientId, isRead, category, pageable);
        } else if (isRead != null) {
            page = notificationRepository.findByRecipientIdAndIsRead(recipientId, isRead, pageable);
        } else if (category != null) {
            page = notificationRepository.findByRecipientIdAndCategory(recipientId, category, pageable);
        } else {
            page = notificationRepository.findByRecipientId(recipientId, pageable);
        }
        return PageResponse.from(page.map(this::toResponse));
    }

    @Transactional(readOnly = true)
    @Override
    public UnreadCountResponse unreadCount(UUID recipientId) {
        return new UnreadCountResponse(
                notificationRepository.countByRecipientIdAndIsReadFalse(recipientId));
    }

    @Override
    public SseEmitter subscribe(UUID recipientId) {
        return sseEmitterRegistry.subscribe(recipientId);
    }

    @Transactional
    @Override
    public NotificationResponse markRead(UUID notificationId, UUID recipientId) {
        Notification notification = notificationRepository.findByIdAndRecipientId(
                        notificationId, recipientId)
                .orElseThrow(() -> new NotificationNotFoundException(notificationId));
        if (!notification.getIsRead()) {
            notification.setIsRead(true);
            notification.setReadAt(Instant.now());
        }
        return toResponse(notificationRepository.save(notification));
    }

    @Transactional
    @Override
    public int markAllRead(UUID recipientId) {
        return notificationRepository.markAllRead(recipientId, Instant.now());
    }

    @Transactional(readOnly = true)
    @Override
    public PageResponse<NotificationTemplateResponse> listTemplates(Pageable pageable) {
        return PageResponse.from(templateRepository.findAll(pageable).map(this::toTemplateResponse));
    }

    @Transactional
    @Override
    public NotificationTemplateResponse updateTemplate(
            UUID templateId, UpdateNotificationTemplateRequest request) {
        NotificationTemplate template = templateRepository.findById(templateId)
                .orElseThrow(() -> new NotificationTemplateNotFoundException(templateId));
        template.setSubjectTemplate(request.subjectTemplate());
        template.setBodyTemplate(request.bodyTemplate());
        template.setIsActive(request.isActive());
        return toTemplateResponse(templateRepository.save(template));
    }

    private NotificationResponse toResponse(Notification notification) {
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

    private NotificationTemplateResponse toTemplateResponse(NotificationTemplate template) {
        return new NotificationTemplateResponse(
                template.getId(),
                template.getCode(),
                template.getChannel(),
                template.getSubjectTemplate(),
                template.getBodyTemplate(),
                template.getIsActive(),
                template.getCreatedAt(),
                template.getUpdatedAt()
        );
    }
}
