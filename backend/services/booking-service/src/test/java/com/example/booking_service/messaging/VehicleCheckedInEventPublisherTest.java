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
class VehicleCheckedInEventPublisherTest {

    @Mock
    private KafkaTemplate<String, VehicleCheckedInEvent> kafkaTemplate;

    private VehicleCheckedInEventPublisher publisher;

    @BeforeEach
    void setUp() {
        publisher = new VehicleCheckedInEventPublisher(kafkaTemplate);
        ReflectionTestUtils.setField(publisher, "topic", "vehicle-checked-in");
        ReflectionTestUtils.setField(publisher, "publishTimeoutMs", 200L);
    }

    @Test
    void publishesEventKeyedByBookingIdAndWaitsForAck() {
        VehicleCheckedInDomainEvent domainEvent = domainEvent();
        when(kafkaTemplate.send(eq("vehicle-checked-in"), eq(domainEvent.bookingId().toString()), any()))
                .thenReturn(CompletableFuture.completedFuture((SendResult<String, VehicleCheckedInEvent>) null));

        publisher.publish(domainEvent);

        ArgumentCaptor<VehicleCheckedInEvent> captor = ArgumentCaptor.forClass(VehicleCheckedInEvent.class);
        verify(kafkaTemplate).send(eq("vehicle-checked-in"), eq(domainEvent.bookingId().toString()), captor.capture());
        assertEquals(domainEvent.eventId(), captor.getValue().eventId());
        assertEquals(domainEvent.odometerIn(), captor.getValue().odometerIn());
    }

    @Test
    void failedSendThrowsSoTheCheckInTransactionRollsBack() {
        when(kafkaTemplate.send(any(String.class), any(String.class), any()))
                .thenReturn(CompletableFuture.failedFuture(new IllegalStateException("broker down")));

        ApiException exception = assertThrows(ApiException.class, () -> publisher.publish(domainEvent()));

        assertEquals(ErrorCode.EVENT_PUBLISH_FAILED, exception.getErrorCode());
    }

    @Test
    void sendTimeoutThrows() {
        when(kafkaTemplate.send(any(String.class), any(String.class), any()))
                .thenReturn(new CompletableFuture<>());

        ApiException exception = assertThrows(ApiException.class, () -> publisher.publish(domainEvent()));

        assertEquals(ErrorCode.EVENT_PUBLISH_FAILED, exception.getErrorCode());
    }

    private VehicleCheckedInDomainEvent domainEvent() {
        return new VehicleCheckedInDomainEvent(
                UUID.randomUUID(), UUID.randomUUID(), UUID.randomUUID(), UUID.randomUUID(),
                UUID.randomUUID(), 1200, "Minor damage", "Call first", Instant.now());
    }
}
