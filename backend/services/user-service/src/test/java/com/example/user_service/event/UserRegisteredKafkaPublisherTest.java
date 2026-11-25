package com.example.user_service.event;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.kafka.support.SendResult;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.Executor;

import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class UserRegisteredKafkaPublisherTest {

    @Mock
    private KafkaTemplate<String, UserRegisteredEvent> kafkaTemplate;

    private UserRegisteredKafkaPublisher publisher;

    @BeforeEach
    void setUp() {
        publisher = new UserRegisteredKafkaPublisher(kafkaTemplate, Runnable::run);
        ReflectionTestUtils.setField(publisher, "topic", "user-registered");
        ReflectionTestUtils.setField(publisher, "publishTimeoutMs", 5000L);
    }

    @Test
    void publishUsesUserIdAsKafkaKey() {
        UUID userId = UUID.randomUUID();
        UserRegisteredEvent event = new UserRegisteredEvent(
                userId, "customer", "Customer", "customer@example.com", null);
        given(kafkaTemplate.send("user-registered", userId.toString(), event))
                .willReturn(CompletableFuture.<SendResult<String, UserRegisteredEvent>>completedFuture(null));

        publisher.publish(event);

        verify(kafkaTemplate).send("user-registered", userId.toString(), event);
    }
    @Test
    void publishSwallowsBrokerFailure() {
        UUID userId = UUID.randomUUID();
        UserRegisteredEvent event = new UserRegisteredEvent(
                userId, "customer", "Customer", "customer@example.com", null);
        given(kafkaTemplate.send("user-registered", userId.toString(), event))
                .willReturn(CompletableFuture.failedFuture(new IllegalStateException("broker down")));

        publisher.publish(event);

        verify(kafkaTemplate).send("user-registered", userId.toString(), event);
    }
    @Test
    void publishDoesNotRunOnCallingThread() {
        UUID userId = UUID.randomUUID();
        UserRegisteredEvent event = new UserRegisteredEvent(
                userId, "customer", "Customer", "customer@example.com", null);
        given(kafkaTemplate.send("user-registered", userId.toString(), event))
                .willReturn(CompletableFuture.<SendResult<String, UserRegisteredEvent>>completedFuture(null));

        java.util.concurrent.atomic.AtomicReference<String> publishThread = new java.util.concurrent.atomic.AtomicReference<>();
        Executor capturing = runnable -> {
            publishThread.set(Thread.currentThread().getName());
            runnable.run();
        };
        UserRegisteredKafkaPublisher capturingPublisher =
                new UserRegisteredKafkaPublisher(kafkaTemplate, capturing);
        ReflectionTestUtils.setField(capturingPublisher, "topic", "user-registered");
        ReflectionTestUtils.setField(capturingPublisher, "publishTimeoutMs", 5000L);

        capturingPublisher.publish(event);

        verify(kafkaTemplate).send("user-registered", userId.toString(), event);
        org.assertj.core.api.Assertions.assertThat(publishThread.get()).isNotNull();
    }
}
