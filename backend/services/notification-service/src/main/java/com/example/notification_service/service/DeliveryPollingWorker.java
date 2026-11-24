package com.example.notification_service.service;

import com.example.notification_service.entity.NotificationDelivery;
import com.example.notification_service.enums.DeliveryStatus;
import com.example.notification_service.repository.NotificationDeliveryRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;

@Slf4j
@Component
public class DeliveryPollingWorker {

    private static final int BATCH_SIZE = 50;
    private static final int MAX_RETRIES = 5;
    private static final long INITIAL_RETRY_DELAY_SECONDS = 10;

    private final NotificationDeliveryRepository deliveryRepository;
    private final EmailChannelSender emailChannelSender;

    public DeliveryPollingWorker(
            NotificationDeliveryRepository deliveryRepository,
            EmailChannelSender emailChannelSender
    ) {
        this.deliveryRepository = deliveryRepository;
        this.emailChannelSender = emailChannelSender;
    }

    @Scheduled(fixedDelayString = "${app.notification.email-poll-interval-ms:2000}")
    @Transactional
    public void pollPendingDeliveries() {
        List<NotificationDelivery> deliveries =
                deliveryRepository.findBatchForUpdateSkipLocked(BATCH_SIZE);

        for (NotificationDelivery delivery : deliveries) {
            try {
                emailChannelSender.send(delivery);
                delivery.setStatus(DeliveryStatus.SENT);
                delivery.setSentAt(Instant.now());
                delivery.setLastError(null);
            } catch (RuntimeException exception) {
                recordFailure(delivery, exception);
            }
        }
    }

    private void recordFailure(NotificationDelivery delivery, RuntimeException exception) {
        int retryCount = delivery.getRetryCount() + 1;
        delivery.setRetryCount(retryCount);
        delivery.setLastError(errorMessage(exception));

        if (retryCount >= MAX_RETRIES) {
            delivery.setStatus(DeliveryStatus.FAILED);
            log.warn("Email delivery {} failed permanently after {} attempts",
                    delivery.getId(), retryCount);
            return;
        }

        long retryDelaySeconds = INITIAL_RETRY_DELAY_SECONDS * (1L << retryCount);
        delivery.setNextRetryAt(Instant.now().plusSeconds(retryDelaySeconds));
        log.warn("Email delivery {} failed; retry {} scheduled in {} seconds",
                delivery.getId(), retryCount, retryDelaySeconds);
    }

    private String errorMessage(RuntimeException exception) {
        String message = exception.getMessage();
        return message == null || message.isBlank()
                ? exception.getClass().getSimpleName()
                : message;
    }
}
