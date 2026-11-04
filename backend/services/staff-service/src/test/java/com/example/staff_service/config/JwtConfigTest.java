package com.example.staff_service.config;

import org.junit.jupiter.api.Test;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.Base64;

import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;

class JwtConfigTest {

    @Test
    void jwtDecoderRejectsInvalidBase64Secret() {
        JwtConfig config = configWithSecret("not-valid-base64!");

        assertThrows(IllegalArgumentException.class, config::jwtDecoder);
    }

    @Test
    void jwtDecoderRejectsSecretShorterThan32Bytes() {
        JwtConfig config = configWithSecret(Base64.getEncoder().encodeToString(new byte[31]));

        assertThrows(IllegalArgumentException.class, config::jwtDecoder);
    }

    @Test
    void jwtDecoderAccepts32ByteSecret() {
        JwtDecoder decoder = configWithSecret(
                Base64.getEncoder().encodeToString(new byte[32])).jwtDecoder();

        assertNotNull(decoder);
    }

    private JwtConfig configWithSecret(String secret) {
        JwtConfig config = new JwtConfig();
        ReflectionTestUtils.setField(config, "secret", secret);
        return config;
    }
}
