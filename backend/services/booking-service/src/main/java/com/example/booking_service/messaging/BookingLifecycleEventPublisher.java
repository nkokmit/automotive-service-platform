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

import java.util.UUID;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;

@Component
@RequiredArgsConstructor
@Slf4j
public class BookingLifecycleEventPublisher {

    private final KafkaTemplate<String, Object> kafkaTemplate;

    @Value("${app.kafka.topics.booking-created:booking.created}")
    private String bookingCreatedTopic;

    @Value("${app.kafka.topics.booking-canceled:booking.canceled}")
    private String bookingCanceledTopic;

    @Value("${app.kafka.publish-timeout-ms:5000}")
    private long publishTimeoutMs;

    @TransactionalEventListener(phase = TransactionPhase.BEFORE_COMMIT)
    public void publish(BookingCreatedDomainEvent domainEvent) {
        BookingCreatedEvent event = new BookingCreatedEvent(
                domainEvent.eventId(),
                domainEvent.bookingId(),
                domainEvent.customerId(),
                domainEvent.appointmentTime(),
                domainEvent.occurredAt());
        publish(bookingCreatedTopic, event.bookingId(), event);
    }

    @TransactionalEventListener(phase = TransactionPhase.BEFORE_COMMIT)
    public void publish(BookingCanceledDomainEvent domainEvent) {
        BookingCanceledEvent event = new BookingCanceledEvent(
                domainEvent.eventId(),
                domainEvent.bookingId(),
                domainEvent.customerId(),
                domainEvent.appointmentTime(),
                domainEvent.reason(),
                domainEvent.occurredAt());
        publish(bookingCanceledTopic, event.bookingId(), event);
    }

    private void publish(String topic, UUID bookingId, Object event) {
        try {
            kafkaTemplate.send(topic, bookingId.toString(), event)
                    .get(publishTimeoutMs, TimeUnit.MILLISECONDS);
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            throw publishFailure(topic, bookingId, exception);
        } catch (ExecutionException | TimeoutException | RuntimeException exception) {
            throw publishFailure(topic, bookingId, exception);
        }
        log.info("Đã publish booking event cho bookingId={} vào topic={}", bookingId, topic);
    }

    private ApiException publishFailure(String topic, UUID bookingId, Exception cause) {
        log.error("Không thể publish booking event cho bookingId={} vào topic={}", bookingId, topic, cause);
        return new ApiException(ErrorCode.EVENT_PUBLISH_FAILED);
    }
}
