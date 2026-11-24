package com.example.notification_service.service;

import com.example.notification_service.repository.ProcessedEventRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;

@Slf4j
@Component
public class ProcessedEventCleanupWorker {

    private final ProcessedEventRepository processedEventRepository;

    public ProcessedEventCleanupWorker(ProcessedEventRepository processedEventRepository) {
        this.processedEventRepository = processedEventRepository;
    }

    @Scheduled(cron = "${app.notification.processed-events-cleanup-cron:0 0 2 * * *}")
    @Transactional
    public void cleanupProcessedEvents() {
        int deleted = processedEventRepository.deleteProcessedBefore(
                Instant.now().minus(30, ChronoUnit.DAYS));
        if (deleted > 0) {
            log.info("Deleted {} processed notification events older than 30 days", deleted);
        }
    }
}
