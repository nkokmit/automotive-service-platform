package com.example.notification_service.integration.client;

import com.example.notification_service.integration.contract.ServiceApiResponse;
import com.example.notification_service.integration.contract.UserProfileResponse;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

import java.util.UUID;

@FeignClient(
        name = "user-service",
        url = "${app.integration.user-service-url:http://localhost:8081}",
        configuration = UserClientConfig.class
)
public interface UserClient {

    @GetMapping("/api/users/{id}")
    ServiceApiResponse<UserProfileResponse> getUserById(@PathVariable UUID id);
}
