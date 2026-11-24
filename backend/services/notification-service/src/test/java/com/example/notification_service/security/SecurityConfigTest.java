package com.example.notification_service.security;

import com.example.notification_service.exception.CustomAccessDeniedHandler;
import com.example.notification_service.exception.CustomAuthenticationEntryPoint;
import com.nimbusds.jose.jwk.source.ImmutableSecret;
import org.junit.jupiter.api.Test;
import org.springframework.mock.env.MockEnvironment;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.security.oauth2.jwt.NimbusJwtEncoder;
import org.springframework.security.oauth2.jwt.JwsHeader;
import javax.crypto.spec.SecretKeySpec;
import java.time.Instant;
import java.util.Base64;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.mock;

class SecurityConfigTest {

    @Test
    void decoderAcceptsTokensSignedWithTheConfiguredBase64Secret() {
        byte[] keyBytes = new byte[32];
        String base64Secret = Base64.getEncoder().encodeToString(keyBytes);
        SecurityConfig config = new SecurityConfig(
                mock(CustomAuthenticationEntryPoint.class),
                mock(CustomAccessDeniedHandler.class));
        MockEnvironment environment = new MockEnvironment().withProperty("jwt.secret", base64Secret);

        JwtEncoderParameters parameters = JwtEncoderParameters.from(
                JwsHeader.with(MacAlgorithm.HS256).build(),
                JwtClaimsSet.builder()
                        .subject("test-user")
                        .issuedAt(Instant.now())
                        .expiresAt(Instant.now().plusSeconds(60))
                        .build());
        NimbusJwtEncoder encoder = new NimbusJwtEncoder(
                new ImmutableSecret<>(new SecretKeySpec(keyBytes, "HmacSHA256")));
        String token = encoder.encode(parameters).getTokenValue();

        JwtDecoder decoder = config.jwtDecoder(environment);

        assertEquals("test-user", decoder.decode(token).getSubject());
    }
}
