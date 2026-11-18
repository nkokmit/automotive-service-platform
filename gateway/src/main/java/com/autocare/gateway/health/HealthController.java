package com.autocare.gateway.health;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.http.server.reactive.ServerHttpResponse;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
import reactor.core.publisher.Mono;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Health check endpoint cho Gateway.
 *
 * Endpoint: GET /healthz
 *
 * Trả về JSON:
 *   {
 *     "status": "UP",
 *     "gateway": "UP",
 *     "upstreams": {
 *       "userService": "http://localhost:8081",
 *       "garageService": "http://localhost:8082",
 *       ...
 *     },
 *     "timestamp": "2026-10-07T10:00:00Z"
 *   }
 *
 * KHÔNG gọi thực tế đến upstream service (để tránh timeout khi service chưa lên).
 * Khi cần health-check upstream chi tiết, dùng Spring Boot Actuator + health indicator.
 */
@RestController
public class HealthController {

    private static final Logger log = LoggerFactory.getLogger(HealthController.class);

    @Value("${USER_SVC_URL:http://localhost:8081}")
    private String userSvc;

    @Value("${GARAGE_SVC_URL:http://localhost:8082}")
    private String garageSvc;

    @Value("${COMMERCE_SVC_URL:http://localhost:8083}")
    private String commerceSvc;

    @Value("${CONTENT_SVC_URL:http://localhost:8084}")
    private String contentSvc;

    @Value("${AI_DAMAGE_URL:http://localhost:9001}")
    private String aiDamage;

    @Value("${AI_RECOMMEND_URL:http://localhost:9002}")
    private String aiRecommend;

    @Value("${AI_AGENT_URL:http://localhost:9003}")
    private String aiAgent;

    @GetMapping(value = "/healthz", produces = MediaType.APPLICATION_JSON_VALUE)
    public Mono<Map<String, Object>> health() {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("status", "UP");
        body.put("gateway", "UP");
        Map<String, String> upstreams = new LinkedHashMap<>();
        upstreams.put("userService", userSvc);
        upstreams.put("garageService", garageSvc);
        upstreams.put("commerceService", commerceSvc);
        upstreams.put("contentService", contentSvc);
        upstreams.put("damageDetection", aiDamage);
        upstreams.put("recommendation", aiRecommend);
        upstreams.put("agentService", aiAgent);
        body.put("upstreams", upstreams);
        body.put("timestamp", Instant.now().toString());
        log.debug("Health check requested");
        return Mono.just(body);
    }
}