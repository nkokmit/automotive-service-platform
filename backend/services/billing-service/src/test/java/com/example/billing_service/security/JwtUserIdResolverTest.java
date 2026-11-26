package com.example.billing_service.security;

import com.example.billing_service.exception.ApiException;
import org.junit.jupiter.api.Test;
import org.springframework.security.oauth2.jwt.Jwt;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

/**
 * Regression test cho bug: billing-service đọc userId từ {@code jwt.getSubject()}
 * (username) thay vì claim {@code userId} (UUID), gây
 * {@code IllegalArgumentException: Invalid UUID string: admin}.
 */
class JwtUserIdResolverTest {

    private static final String USER_ID = "10000000-0000-0000-0000-000000000001";

    @Test
    void resolvesUserIdFromClaimWhenSubjectIsNotAUuid() {
        Jwt jwt = jwt("admin", USER_ID);

        assertEquals(UUID.fromString(USER_ID), JwtUserIdResolver.resolveUserId(jwt));
    }

    @Test
    void fallsBackToSubjectWhenUserIdClaimIsMissing() {
        Jwt jwt = jwt(USER_ID, null);

        assertEquals(UUID.fromString(USER_ID), JwtUserIdResolver.resolveUserId(jwt));
    }

    @Test
    void fallsBackToSubjectWhenUserIdClaimIsNotAUuid() {
        Jwt jwt = jwt(USER_ID, "not-a-uuid");

        assertEquals(UUID.fromString(USER_ID), JwtUserIdResolver.resolveUserId(jwt));
    }

    @Test
    void prefersUserIdClaimOverSubject() {
        Jwt jwt = jwt(
                "10000000-0000-0000-0000-000000000002",
                "10000000-0000-0000-0000-000000000003"
        );

        assertEquals(
                UUID.fromString("10000000-0000-0000-0000-000000000003"),
                JwtUserIdResolver.resolveUserId(jwt)
        );
    }

    @Test
    void throwsWhenTokenCarriesNoUsableIdentity() {
        Jwt jwt = jwt("admin", null);

        assertThrows(ApiException.class, () -> JwtUserIdResolver.resolveUserId(jwt));
    }

    @Test
    void throwsWhenTokenIsMissing() {
        assertThrows(ApiException.class, () -> JwtUserIdResolver.resolveUserId(null));
    }

    private Jwt jwt(String subject, String userIdClaim) {
        Jwt.Builder builder = Jwt.withTokenValue("token")
                .header("alg", "none")
                .subject(subject)
                .issuedAt(Instant.parse("2026-01-01T00:00:00Z"))
                .expiresAt(Instant.parse("2027-01-01T00:00:00Z"));
        if (userIdClaim != null) {
            builder.claim("userId", userIdClaim);
        }
        builder.claims(claims -> claims.put("authorities", List.of("INVOICE_READ")));
        return builder.build();
    }
}
