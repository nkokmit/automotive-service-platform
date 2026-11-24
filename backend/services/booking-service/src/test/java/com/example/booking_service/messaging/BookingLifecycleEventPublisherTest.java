package com.example.booking_service.messaging;

import com.example.booking_service.exception.ApiException;
import com.example.booking_service.exception.ErrorCode;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.kafka.support.SendResult;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.Instant;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class BookingLifecycleEventPublisherTest {

    @Mock
    private KafkaTemplate<String, Object> kafkaTemplate;

    private BookingLifecycleEventPublisher publisher;

    @BeforeEach
    void setUp() {
        publisher = new BookingLifecycleEventPublisher(kafkaTemplate);
        ReflectionTestUtils.setField(publisher, "bookingCreatedTopic", "booking.created");
        ReflectionTestUtils.setField(publisher, "bookingCanceledTopic", "booking.canceled");
        ReflectionTestUtils.setField(publisher, "publishTimeoutMs", 200L);
    }

    @Test
    void publishesCreatedEventWithBookingIdAsKeyAndWaitsForAck() {
        BookingCreatedDomainEvent event = new BookingCreatedDomainEvent(
                UUID.randomUUID(), UUID.randomUUID(), UUID.randomUUID(), Instant.now(), Instant.now());
        when(kafkaTemplate.send(eq("booking.created"), eq(event.bookingId().toString()), any()))
                .thenReturn(CompletableFuture.completedFuture((SendResult<String, Object>) null));

        publisher.publish(event);

        ArgumentCaptor<Object> captor = ArgumentCaptor.forClass(Object.class);
        verify(kafkaTemplate).send(eq("booking.created"), eq(event.bookingId().toString()), captor.capture());
        assertEquals(new BookingCreatedEvent(
                event.eventId(), event.bookingId(), event.customerId(),
                event.appointmentTime(), event.occurredAt()), captor.getValue());
    }

    @Test
    void publishesCanceledEventToCancellationTopic() {
        BookingCanceledDomainEvent event = new BookingCanceledDomainEvent(
                UUID.randomUUID(), UUID.randomUUID(), UUID.randomUUID(), Instant.now(), "requested", Instant.now());
        when(kafkaTemplate.send(eq("booking.canceled"), eq(event.bookingId().toString()), any()))
                .thenReturn(CompletableFuture.completedFuture((SendResult<String, Object>) null));

        publisher.publish(event);

        verify(kafkaTemplate).send(
                eq("booking.canceled"),
                eq(event.bookingId().toString()),
                eq(new BookingCanceledEvent(
                        event.eventId(), event.bookingId(), event.customerId(),
                        event.appointmentTime(), event.reason(), event.occurredAt())));
    }

    @Test
    void failedSendThrowsSoTheBookingTransactionRollsBack() {
        when(kafkaTemplate.send(any(String.class), any(String.class), any()))
                .thenReturn(CompletableFuture.failedFuture(new IllegalStateException("broker down")));

        ApiException exception = assertThrows(ApiException.class, () -> publisher.publish(
                new BookingCreatedDomainEvent(
                        UUID.randomUUID(), UUID.randomUUID(), UUID.randomUUID(), Instant.now(), Instant.now())));

        assertEquals(ErrorCode.EVENT_PUBLISH_FAILED, exception.getErrorCode());
    }
}
