package com.example.work_order_service.service;

import com.example.work_order_service.repository.ProcessedEventRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;

@Service
@RequiredArgsConstructor
@Slf4j
public class ProcessedEventCleanupService {

    private final ProcessedEventRepository processedEventRepository;

    @Scheduled(cron = "0 0 2 * * *")
    @Transactional
    public void deleteExpiredEvents() {
        int deleted = processedEventRepository.deleteProcessedBefore(Instant.now().minus(30, ChronoUnit.DAYS));
        if (deleted > 0) {
            log.info("Removed {} processed Kafka events older than 30 days", deleted);
        }
    }
}
