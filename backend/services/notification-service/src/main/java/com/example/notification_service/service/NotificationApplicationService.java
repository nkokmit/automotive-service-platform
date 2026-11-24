package com.example.notification_service.service;

import com.example.notification_service.entity.Notification;
import com.example.notification_service.repository.NotificationRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class NotificationApplicationService {

    private final NotificationRepository notificationRepository;
    private final InAppChannelSender inAppChannelSender;

    public NotificationApplicationService(
            NotificationRepository notificationRepository,
            InAppChannelSender inAppChannelSender
    ) {
        this.notificationRepository = notificationRepository;
        this.inAppChannelSender = inAppChannelSender;
    }

    @Transactional
    public Notification create(Notification notification) {
        Notification saved = notificationRepository.save(notification);
        inAppChannelSender.send(saved);
        return saved;
    }
}
