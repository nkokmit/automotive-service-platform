package com.example.booking_service.integration.support;

import feign.FeignException;
import feign.Request;
import org.junit.jupiter.api.Test;

import java.nio.charset.StandardCharsets;
import java.util.Collections;
import java.util.Map;
import java.util.concurrent.atomic.AtomicInteger;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

class IntegrationCallRetrierTest {

    private final IntegrationCallRetrier retrier = new IntegrationCallRetrier();

    @Test
    void retriesTransientReadFailuresAtMostTwice() {
        AtomicInteger attempts = new AtomicInteger();

        String result = retrier.execute("test-service", () -> {
            if (attempts.incrementAndGet() < 3) {
                throw feign(503);
            }
            return "ok";
        });

        assertEquals("ok", result);
        assertEquals(3, attempts.get());
    }

    @Test
    void doesNotRetryClientErrors() {
        AtomicInteger attempts = new AtomicInteger();

        assertThrows(FeignException.class, () -> retrier.execute("test-service", () -> {
            attempts.incrementAndGet();
            throw feign(400);
        }));

        assertEquals(1, attempts.get());
    }

    private FeignException feign(int status) {
        Request request = Request.create(Request.HttpMethod.GET, "http://service", Map.of(), null,
                StandardCharsets.UTF_8, null);
        return FeignException.errorStatus("call", feign.Response.builder()
                .request(request)
                .status(status)
                .headers(Collections.emptyMap())
                .build());
    }
}
