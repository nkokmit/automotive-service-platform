package com.example.staff_service.security;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

class CurrentActorIdProviderTest {

    private final CurrentActorIdProvider provider = new CurrentActorIdProvider();

    @AfterEach
    void clearSecurityContext() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void resolvesUserIdFromUserServiceJwtClaimWhenSubjectIsUsername() {
        UUID userId = UUID.randomUUID();
        setAuthentication(jwt("manager@example.com", userId.toString()));

        assertThat(provider.getCurrentUserId()).isEqualTo(userId);
    }

    @Test
    void fallsBackToUuidSubjectForCompatibleTokens() {
        UUID userId = UUID.randomUUID();
        setAuthentication(jwt(userId.toString(), null));

        assertThat(provider.getCurrentUserId()).isEqualTo(userId);
    }

    @Test
    void returnsNullWhenThereIsNoUuidIdentityInTheJwt() {
        setAuthentication(jwt("manager@example.com", null));

        assertThat(provider.getCurrentUserId()).isNull();
    }

    private Jwt jwt(String subject, String userId) {
        Jwt.Builder builder = Jwt.withTokenValue("test-token")
                .header("alg", "none")
                .subject(subject)
                .issuedAt(Instant.now())
                .expiresAt(Instant.now().plusSeconds(60))
                .claim("authorities", List.of());
        if (userId != null) {
            builder.claim("userId", userId);
        }
        return builder.build();
    }

    private void setAuthentication(Jwt jwt) {
        SecurityContextHolder.getContext().setAuthentication(new JwtAuthenticationToken(jwt));
    }
}
