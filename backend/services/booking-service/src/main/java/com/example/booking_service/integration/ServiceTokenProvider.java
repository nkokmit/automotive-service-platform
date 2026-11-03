package com.example.booking_service.integration;

import com.nimbusds.jose.jwk.source.ImmutableSecret;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.security.oauth2.jwt.NimbusJwtEncoder;

import javax.crypto.spec.SecretKeySpec;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.List;

/**
 * Phát token dịch vụ của chính booking-service (không dùng JWT của khách) để gọi API nội bộ.
 * Token chỉ mang đúng các authority nội bộ được cấp, và được cache đến gần hết hạn.
 */
public class ServiceTokenProvider {

    private static final Duration TTL = Duration.ofMinutes(5);
    private static final Duration REFRESH_BEFORE_EXPIRY = Duration.ofSeconds(30);

    private final JwtEncoder encoder;
    private final String subject;
    private final List<String> authorities;
    private final Clock clock;

    private String cachedToken;
    private Instant cachedExpiry = Instant.EPOCH;

    public ServiceTokenProvider(String base64Secret, String subject, List<String> authorities, Clock clock) {
        byte[] keyBytes = Base64.getDecoder().decode(base64Secret);
        if (keyBytes.length < 32) {
            throw new IllegalArgumentException("JWT_SECRET must decode to at least 32 bytes for HS256");
        }
        this.encoder = new NimbusJwtEncoder(new ImmutableSecret<>(new SecretKeySpec(keyBytes, "HmacSHA256")));
        this.subject = subject;
        this.authorities = List.copyOf(authorities);
        this.clock = clock;
    }

    public synchronized String getToken() {
        Instant now = clock.instant();
        if (cachedToken == null || now.isAfter(cachedExpiry.minus(REFRESH_BEFORE_EXPIRY))) {
            Instant expiry = now.plus(TTL);
            JwtClaimsSet claims = JwtClaimsSet.builder()
                    .subject(subject)
                    .issuedAt(now)
                    .expiresAt(expiry)
                    .claim("authorities", authorities)
                    .build();
            cachedToken = encoder.encode(
                    JwtEncoderParameters.from(JwsHeader.with(MacAlgorithm.HS256).build(), claims)).getTokenValue();
            cachedExpiry = expiry;
        }
        return cachedToken;
    }
}
