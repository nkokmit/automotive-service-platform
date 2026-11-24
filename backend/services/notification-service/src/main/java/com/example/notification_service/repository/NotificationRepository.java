package com.example.notification_service.repository;

import com.example.notification_service.entity.Notification;
import com.example.notification_service.enums.NotificationCategory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

public interface NotificationRepository extends JpaRepository<Notification, UUID> {
    Page<Notification> findByRecipientId(UUID recipientId, Pageable pageable);
    Page<Notification> findByRecipientIdAndIsRead(UUID recipientId, Boolean isRead, Pageable pageable);
    Page<Notification> findByRecipientIdAndCategory(UUID recipientId, NotificationCategory category, Pageable pageable);
    Page<Notification> findByRecipientIdAndIsReadAndCategory(
            UUID recipientId, Boolean isRead, NotificationCategory category, Pageable pageable);
    long countByRecipientIdAndIsReadFalse(UUID recipientId);
    Optional<Notification> findByIdAndRecipientId(UUID id, UUID recipientId);

    @Modifying
    @Query("""
            update Notification notification
            set notification.isRead = true, notification.readAt = :readAt
            where notification.recipientId = :recipientId
              and notification.isRead = false
            """)
    int markAllRead(@Param("recipientId") UUID recipientId, @Param("readAt") Instant readAt);
}
