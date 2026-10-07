package com.autocare.gateway.security;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.reactive.EnableWebFluxSecurity;
import org.springframework.security.config.web.server.ServerHttpSecurity;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.security.web.server.SecurityWebFilterChain;

import java.io.InputStream;
import java.security.KeyFactory;
import java.security.interfaces.RSAPublicKey;
import java.security.spec.X509EncodedKeySpec;
import java.util.Base64;

/**
 * Spring Cloud Gateway dùng WebFlux (reactive), KHÔNG dùng Spring MVC.
 *
 * Security flow:
 *   1. Request đến Gateway
 *   2. Nếu path thuộc public list (/healthz, /docs/**, OPTIONS) → pass
 *   3. Nếu có JWT trong header Authorization: Bearer xxx → verify bằng RS256 public key
 *   4. Nếu verify OK → tiếp tục; nếu fail → 401
 *   5. GlobalRequestFilter (HIGHEST_PRECEDENCE) sẽ đọc JWT claims và chèn X-User-* headers
 *
 * ⚠️ Trong PHASE 1 (chưa có user-service), public-key chưa tồn tại → file jwt-public.pem
 * chưa có. Khi đó JWT verify fail vì decoder không init được.
 *
 * Để CHẠY ĐƯỢC NGAY mà không cần JWT (cho demo Frontend ↔ Gateway ↔ Mock service),
 * application-dev.yml sẽ disable security.
 */
@Configuration
public class JwtConfig {

    @Value("${JWT_PUBLIC_KEY_LOCATION:classpath:jwt-public.pem}")
    private Resource publicKeyResource;

    /**
     * JwtDecoder từ file PEM public key (RS256).
     * Trong production: thay bằng NimbusJwtDecoder.withJwkSetUri(...) để auto-rotate.
     *
     * CHỈ tạo bean này khi KHÔNG ở dev mode (gateway.security.disabled=false).
     */
    @Bean
    @ConditionalOnProperty(name = "gateway.security.disabled", havingValue = "false", matchIfMissing = false)
    public JwtDecoder jwtDecoder() throws Exception {
        try (InputStream is = publicKeyResource.getInputStream()) {
            String pem = new String(is.readAllBytes());
            String publicKeyPEM = pem
                    .replace("-----BEGIN PUBLIC KEY-----", "")
                    .replace("-----END PUBLIC KEY-----", "")
                    .replaceAll("\\s", "");
            byte[] decoded = Base64.getDecoder().decode(publicKeyPEM);
            X509EncodedKeySpec spec = new X509EncodedKeySpec(decoded);
            KeyFactory kf = KeyFactory.getInstance("RSA");
            RSAPublicKey publicKey = (RSAPublicKey) kf.generatePublic(spec);
            return NimbusJwtDecoder.withPublicKey(publicKey).build();
        }
    }

    /**
     * Security chain: chỉ áp dụng khi KHÔNG có property `gateway.security.disabled=true`.
     */
    @Bean
    public org.springframework.security.web.server.SecurityWebFilterChain securityWebFilterChain(
            ServerHttpSecurity http,
            @Value("${gateway.security.disabled:false}") boolean devMode) {

        if (devMode) {
            // DEV MODE: bypass JWT verify (chỉ dùng khi chưa có user-service)
            return http
                    .csrf(csrf -> csrf.disable())
                    .authorizeExchange(authz -> authz.anyExchange().permitAll())
                    .build();
        }

        // PROD MODE: enforce JWT
        return http
                .csrf(csrf -> csrf.disable())
                .authorizeExchange(authz -> authz
                        .pathMatchers("/healthz").permitAll()
                        .pathMatchers("/docs/**", "/swagger-ui.html", "/v3/api-docs/**", "/webjars/**").permitAll()
                        .pathMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                        .anyExchange().authenticated())
                .oauth2ResourceServer(oauth2 -> oauth2.jwt(org.springframework.security.config.Customizer.withDefaults()))
                .build();
    }
}