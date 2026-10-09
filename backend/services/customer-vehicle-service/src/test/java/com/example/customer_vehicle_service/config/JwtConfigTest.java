package com.example.customer_vehicle_service.config;

import org.junit.jupiter.api.Test;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtException;
import org.springframework.test.util.ReflectionTestUtils;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Base64;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;

class JwtConfigTest {

    @Test
    void jwtDecoderRejectsInvalidBase64Secret() {
        JwtConfig config = configWithSecret("not-valid-base64!");

        IllegalArgumentException exception = assertThrows(
                IllegalArgumentException.class, config::jwtDecoder);

        assertEquals("JWT_SECRET must be valid Base64", exception.getMessage());
    }

    @Test
    void jwtDecoderRejectsSecretShorterThan32Bytes() {
        JwtConfig config = configWithSecret(Base64.getEncoder().encodeToString(new byte[31]));

        IllegalArgumentException exception = assertThrows(
                IllegalArgumentException.class, config::jwtDecoder);

        assertEquals("JWT_SECRET must decode to at least 32 bytes for HS256", exception.getMessage());
    }

    @Test
    void jwtDecoderAccepts32ByteSecret() {
        assertNotNull(decoderWithKey(new byte[32]));
    }

    @Test
    void jwtDecoderAcceptsValidHs256Token() throws Exception {
        byte[] key = new byte[32];
        String token = signedToken(key, "HS256", "HmacSHA256", Instant.now().plusSeconds(300));

        Jwt jwt = decoderWithKey(key).decode(token);

        assertEquals("admin", jwt.getSubject());
        assertEquals("HS256", jwt.getHeaders().get("alg"));
    }

    @Test
    void jwtDecoderRejectsInvalidSignature() throws Exception {
        byte[] signingKey = new byte[32];
        signingKey[0] = 1;
        String token = signedToken(signingKey, "HS256", "HmacSHA256", Instant.now().plusSeconds(300));
        JwtDecoder decoder = decoderWithKey(new byte[32]);

        assertThrows(JwtException.class, () -> decoder.decode(token));
    }

    @Test
    void jwtDecoderRejectsExpiredToken() throws Exception {
        byte[] key = new byte[32];
        String token = signedToken(key, "HS256", "HmacSHA256", Instant.now().minusSeconds(300));
        JwtDecoder decoder = decoderWithKey(key);

        assertThrows(JwtException.class, () -> decoder.decode(token));
    }

    @Test
    void jwtDecoderRejectsOtherAlgorithms() throws Exception {
        byte[] key = new byte[64];
        String token = signedToken(key, "HS512", "HmacSHA512", Instant.now().plusSeconds(300));
        JwtDecoder decoder = decoderWithKey(key);

        assertThrows(JwtException.class, () -> decoder.decode(token));
    }

    private JwtConfig configWithSecret(String secret) {
        JwtConfig config = new JwtConfig();
        ReflectionTestUtils.setField(config, "secret", secret);
        return config;
    }

    private JwtDecoder decoderWithKey(byte[] key) {
        return configWithSecret(Base64.getEncoder().encodeToString(key)).jwtDecoder();
    }

    private String signedToken(byte[] key, String algorithm, String macAlgorithm,
                               Instant expiresAt) throws Exception {
        Base64.Encoder encoder = Base64.getUrlEncoder().withoutPadding();
        String header = "{\"alg\":\"" + algorithm + "\",\"typ\":\"JWT\"}";
        String payload = "{\"sub\":\"admin\",\"exp\":" + expiresAt.getEpochSecond() + "}";
        String signingInput = encoder.encodeToString(header.getBytes(StandardCharsets.UTF_8))
                + "." + encoder.encodeToString(payload.getBytes(StandardCharsets.UTF_8));
        Mac mac = Mac.getInstance(macAlgorithm);
        mac.init(new SecretKeySpec(key, macAlgorithm));
        byte[] signature = mac.doFinal(signingInput.getBytes(StandardCharsets.US_ASCII));
        return signingInput + "." + encoder.encodeToString(signature);
    }
}
