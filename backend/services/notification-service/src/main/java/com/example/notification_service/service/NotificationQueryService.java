package com.example.notification_service.service;

import com.example.notification_service.dto.request.UpdateNotificationTemplateRequest;
import com.example.notification_service.dto.response.NotificationResponse;
import com.example.notification_service.dto.response.NotificationTemplateResponse;
import com.example.notification_service.dto.response.PageResponse;
import com.example.notification_service.dto.response.UnreadCountResponse;
import com.example.notification_service.enums.NotificationCategory;
import org.springframework.data.domain.Pageable;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.UUID;

public interface NotificationQueryService {

    PageResponse<NotificationResponse> list(
            UUID recipientId, Boolean isRead, NotificationCategory category, Pageable pageable);

    UnreadCountResponse unreadCount(UUID recipientId);

    SseEmitter subscribe(UUID recipientId);

    NotificationResponse markRead(UUID notificationId, UUID recipientId);

    int markAllRead(UUID recipientId);

    PageResponse<NotificationTemplateResponse> listTemplates(Pageable pageable);

    NotificationTemplateResponse updateTemplate(
            UUID templateId, UpdateNotificationTemplateRequest request);
}
