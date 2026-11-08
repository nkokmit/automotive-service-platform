package com.example.work_order_service.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;

import javax.crypto.spec.SecretKeySpec;
import java.util.Base64;

@Configuration
public class JwtConfig {

    @Bean
    public JwtDecoder jwtDecoder(@Value("${jwt.secret}") String secret) {
        byte[] keyBytes;
        try {
            keyBytes = Base64.getDecoder().decode(secret);
        } catch (IllegalArgumentException exception) {
            throw new IllegalArgumentException("JWT_SECRET must be valid Base64", exception);
        }
        if (keyBytes.length < 32) {
            throw new IllegalArgumentException("JWT_SECRET must decode to at least 32 bytes for HS256");
        }

        return NimbusJwtDecoder.withSecretKey(new SecretKeySpec(keyBytes, "HmacSHA256"))
                .macAlgorithm(MacAlgorithm.HS256)
                .build();
    }
}
