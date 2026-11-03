package com.example.booking_service.integration.support;

import com.example.booking_service.exception.ApiException;
import com.example.booking_service.exception.ErrorCode;
import feign.FeignException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.function.Supplier;

@Component
@Slf4j
public class IntegrationCallRetrier {

    private static final int MAX_RETRIES = 2;

    public <T> T execute(String serviceName, Supplier<T> readOperation) {
        for (int retry = 0; ; retry++) {
            try {
                return readOperation.get();
            } catch (FeignException exception) {
                if (!isTransient(exception) || retry >= MAX_RETRIES) {
                    throw exception;
                }
                log.warn("Retrying read from {} after transient HTTP {} failure ({}/{})",
                        serviceName, exception.status(), retry + 1, MAX_RETRIES);
                try {
                    Thread.sleep(100L * (retry + 1));
                } catch (InterruptedException interruptedException) {
                    Thread.currentThread().interrupt();
                    throw new ApiException(ErrorCode.INTEGRATION_SERVICE_UNAVAILABLE,
                            "Đã dừng khi chờ thử lại " + serviceName);
                }
            }
        }
    }

    private boolean isTransient(FeignException exception) {
        return exception.status() == -1 || exception.status() >= 500;
    }
}
