package com.example.customer_vehicle_service.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;

import javax.crypto.spec.SecretKeySpec;
import java.util.Base64;

/**
 * Cấu hình JWT decoder cho customer-vehicle-service.
 *
 * <p>Gateway đã validate token trước khi forward (GLOBAL_RULES §6), service này
 * vẫn re-validate chữ ký để không phụ thuộc vào việc request luôn đi qua gateway
 * (service có thể được gọi trực tiếp trong môi trường dev/debug).
 *
 * <p>Bản servlet tương ứng với {@code JwtConfig} của api-gateway: cùng thuật
 * toán HS256, cùng cách kiểm tra Base64 + độ dài tối thiểu 32 byte, và cùng
 * chủ ý fail fast khi cấu hình sai thay vì chạy với secret yếu.
 */
@Configuration
public class JwtConfig {

    @Value("${jwt.secret}")
    private String secret;

    @Bean
    public JwtDecoder jwtDecoder() {

        byte[] keyBytes;
        try {
            keyBytes = Base64.getDecoder().decode(secret);
        } catch (IllegalArgumentException ex) {
            throw new IllegalArgumentException("JWT_SECRET must be valid Base64", ex);
        }
        if (keyBytes.length < 32) {
            throw new IllegalArgumentException("JWT_SECRET must decode to at least 32 bytes for HS256");
        }

        SecretKeySpec key = new SecretKeySpec(
                keyBytes,
                "HmacSHA256"
        );

        return NimbusJwtDecoder
                .withSecretKey(key)
                .macAlgorithm(MacAlgorithm.HS256)
                .build();
    }
}