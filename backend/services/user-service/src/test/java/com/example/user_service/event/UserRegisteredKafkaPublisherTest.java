package com.example.user_service.event;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.kafka.support.SendResult;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.UUID;
import java.util.concurrent.CompletableFuture;

import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class UserRegisteredKafkaPublisherTest {

    @Mock
    private KafkaTemplate<String, UserRegisteredEvent> kafkaTemplate;

    @InjectMocks
    private UserRegisteredKafkaPublisher publisher;

    @BeforeEach
    void setTopic() {
        ReflectionTestUtils.setField(publisher, "topic", "user-registered");
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
}
