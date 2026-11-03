package com.example.booking_service.integration;

import org.junit.jupiter.api.Test;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;

import javax.crypto.spec.SecretKeySpec;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.Base64;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class ServiceTokenProviderTest {

    private static final String SECRET = Base64.getEncoder().encodeToString(new byte[32]);

    @Test
    void tokenCarriesOnlyInternalAuthorityAndIsCached() {
        ServiceTokenProvider provider = new ServiceTokenProvider(
                SECRET, "booking-service", List.of("INTERNAL_STAFF_CAPACITY_READ"), Clock.systemUTC());

        String token = provider.getToken();
        Jwt jwt = NimbusJwtDecoder.withSecretKey(new SecretKeySpec(new byte[32], "HmacSHA256")).build().decode(token);

        assertThat(jwt.getSubject()).isEqualTo("booking-service");
        assertThat(jwt.getClaimAsStringList("authorities")).containsExactly("INTERNAL_STAFF_CAPACITY_READ");
        assertThat(provider.getToken()).isEqualTo(token);
    }

    @Test
    void tokenIsRefreshedNearExpiry() {
        MutableClock clock = new MutableClock(Instant.parse("2026-01-01T00:00:00Z"));
        ServiceTokenProvider provider = new ServiceTokenProvider(SECRET, "booking-service", List.of("X"), clock);

        String first = provider.getToken();
        clock.now = clock.now.plusSeconds(280);

        assertThat(provider.getToken()).isNotEqualTo(first);
    }

    private static final class MutableClock extends Clock {
        Instant now;

        MutableClock(Instant now) {
            this.now = now;
        }

        @Override
        public ZoneId getZone() {
            return ZoneOffset.UTC;
        }

        @Override
        public Clock withZone(ZoneId zone) {
            return this;
        }

        @Override
        public Instant instant() {
            return now;
        }
    }
}
