package com.example.work_order_service.messaging.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.kafka.listener.DefaultErrorHandler;
import org.springframework.util.backoff.FixedBackOff;

@Configuration
public class KafkaConsumerConfig {

    /**
     * Event check-in có thể tới trước khi booking commit, nên retry cách nhau vài giây thay vì
     * retry liên tục không backoff như mặc định.
     */
    @Bean
    public DefaultErrorHandler kafkaErrorHandler(
            @Value("${app.kafka.consumer.retry-interval-ms:1000}") long retryIntervalMs,
            @Value("${app.kafka.consumer.max-retries:10}") long maxRetries
    ) {
        return new DefaultErrorHandler(new FixedBackOff(retryIntervalMs, maxRetries));
    }
}
