package com.example.notification_service.repository;

import com.example.notification_service.entity.NotificationDelivery;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

public interface NotificationDeliveryRepository extends JpaRepository<NotificationDelivery, UUID> {

    @Query(value = """
            SELECT *
            FROM notification_deliveries
            WHERE status = 'PENDING'
              AND channel = 'EMAIL'
              AND next_retry_at <= NOW(6)
            ORDER BY created_at ASC
            LIMIT :limit
            FOR UPDATE SKIP LOCKED
            """, nativeQuery = true)
    List<NotificationDelivery> findBatchForUpdateSkipLocked(@Param("limit") int limit);
}
