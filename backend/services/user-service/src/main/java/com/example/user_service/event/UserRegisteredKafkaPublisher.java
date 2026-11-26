package com.example.user_service.event;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.task.TaskExecutor;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

import java.util.concurrent.Executor;
import java.util.concurrent.ThreadPoolExecutor;
import java.util.concurrent.TimeUnit;

@Configuration
@EnableAsync
class UserRegisteredEventAsyncConfig {

    @Bean(name = "userRegisteredEventExecutor")
    TaskExecutor userRegisteredEventExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setThreadNamePrefix("user-reg-event-");
        executor.setCorePoolSize(1);
        executor.setMaxPoolSize(2);
        executor.setQueueCapacity(500);
        executor.setRejectedExecutionHandler(new ThreadPoolExecutor.CallerRunsPolicy());
        executor.setWaitForTasksToCompleteOnShutdown(false);
        executor.setAwaitTerminationSeconds(5);
        executor.initialize();
        return executor;
    }
}

@Component
@Slf4j
public class UserRegisteredKafkaPublisher {

    private final KafkaTemplate<String, UserRegisteredEvent> kafkaTemplate;

    private final Executor eventExecutor;

    public UserRegisteredKafkaPublisher(
            KafkaTemplate<String, UserRegisteredEvent> kafkaTemplate,
            @Qualifier("userRegisteredEventExecutor") Executor eventExecutor) {
        this.kafkaTemplate = kafkaTemplate;
        this.eventExecutor = eventExecutor;
    }

    @Value("${app.kafka.topics.user-registered:user-registered}")
    private String topic;

    @Value("${app.kafka.publish-timeout-ms:5000}")
    private long publishTimeoutMs;

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void publish(UserRegisteredEvent event) {
        eventExecutor.execute(() -> doPublish(event));
    }

    private void doPublish(UserRegisteredEvent event) {
        try {
            kafkaTemplate.send(topic, event.userId().toString(), event)
                    .get(publishTimeoutMs, TimeUnit.MILLISECONDS);
            log.info("Đã publish UserRegistered event cho userId={} vào topic={}",
                    event.userId(), topic);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            log.warn("Bị gián đoạn khi publish UserRegistered event cho userId={}",
                    event.userId());
        } catch (Exception e) {
            log.error("Không thể publish UserRegistered event cho userId={} (Kafka có thể đang không sẵn sàng)",
                    event.userId(), e);
        }
    }
}
