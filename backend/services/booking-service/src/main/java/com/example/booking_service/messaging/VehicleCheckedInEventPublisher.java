package com.example.booking_service.messaging;

import com.example.booking_service.exception.ApiException;
import com.example.booking_service.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

import java.util.concurrent.ExecutionException;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;

@Component
@RequiredArgsConstructor
@Slf4j
public class VehicleCheckedInEventPublisher {

    private final KafkaTemplate<String, VehicleCheckedInEvent> kafkaTemplate;

    @Value("${app.kafka.topics.vehicle-checked-in:vehicle-checked-in}")
    private String topic;

    @Value("${app.kafka.publish-timeout-ms:5000}")
    private long publishTimeoutMs;

    /**
     * Gửi trước commit và chờ broker ack: nếu không gửi được, transaction check-in bị rollback
     * để staff thử lại, tránh trạng thái đã CHECKED_IN nhưng không có event.
     */
    @TransactionalEventListener(phase = TransactionPhase.BEFORE_COMMIT)
    public void publish(VehicleCheckedInDomainEvent domainEvent) {
        VehicleCheckedInEvent event = new VehicleCheckedInEvent(
                domainEvent.eventId(),
                domainEvent.bookingId(),
                domainEvent.customerId(),
                domainEvent.vehicleId(),
                domainEvent.advisorId(),
                domainEvent.odometerIn(),
                domainEvent.vehicleCondition(),
                domainEvent.customerNote(),
                domainEvent.occurredAt());
        try {
            kafkaTemplate.send(topic, event.bookingId().toString(), event)
                    .get(publishTimeoutMs, TimeUnit.MILLISECONDS);
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            throw publishFailure(event, exception);
        } catch (ExecutionException | TimeoutException | RuntimeException exception) {
            throw publishFailure(event, exception);
        }
        log.info("Đã publish VehicleCheckedInEvent cho bookingId={} vào topic={}",
                event.bookingId(), topic);
    }

    private ApiException publishFailure(VehicleCheckedInEvent event, Exception cause) {
        log.error("Không thể publish VehicleCheckedInEvent cho bookingId={}", event.bookingId(), cause);
        return new ApiException(ErrorCode.EVENT_PUBLISH_FAILED);
    }
}
