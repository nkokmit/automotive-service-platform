package com.example.notification_service.repository;

import com.example.notification_service.entity.NotificationTemplate;
import com.example.notification_service.enums.NotificationChannel;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface NotificationTemplateRepository extends JpaRepository<NotificationTemplate, UUID> {
    Optional<NotificationTemplate> findByCodeAndChannelAndIsActiveTrue(String code, NotificationChannel channel);
}
