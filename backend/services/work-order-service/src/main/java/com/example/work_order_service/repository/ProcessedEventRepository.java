package com.example.work_order_service.repository;

import com.example.work_order_service.entity.ProcessedEvent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.UUID;

public interface ProcessedEventRepository extends JpaRepository<ProcessedEvent, UUID> {

    @Modifying
    @Query(value = """
            INSERT IGNORE INTO processed_events (event_id, topic, event_type, aggregate_id, processed_at)
            VALUES (:eventId, :topic, :eventType, :aggregateId, NOW(6))
            """, nativeQuery = true)
    int insertIfAbsent(
            @Param("eventId") String eventId,
            @Param("topic") String topic,
            @Param("eventType") String eventType,
            @Param("aggregateId") String aggregateId
    );

    @Modifying
    @Query("delete from ProcessedEvent event where event.processedAt < :cutoff")
    int deleteProcessedBefore(@Param("cutoff") Instant cutoff);
}
