package com.example.billing_service.security;

import com.example.billing_service.exception.ApiException;
import com.example.billing_service.exception.ErrorCode;
import org.springframework.security.oauth2.jwt.Jwt;

import java.util.UUID;

/**
 * Resolve the acting user's UUID from an access token.
 *
 * <p>The identity provider issues tokens whose {@code sub} claim holds the username
 * (for example {@code "admin"}), while the account UUID is carried by the separate
 * {@code userId} claim. Reading the UUID from {@code sub} therefore fails for every
 * account whose username is not a UUID, so the {@code userId} claim is preferred and
 * {@code sub} is only used as a fallback for tokens that do not carry it.
 */
public final class JwtUserIdResolver {

    private JwtUserIdResolver() {
    }

    public static UUID resolveUserId(Jwt jwt) {
        if (jwt == null) {
            throw new ApiException(ErrorCode.UNAUTHENTICATED);
        }

        UUID fromUserIdClaim = parseUuid(jwt.getClaimAsString("userId"));
        if (fromUserIdClaim != null) {
            return fromUserIdClaim;
        }

        UUID fromSubject = parseUuid(jwt.getSubject());
        if (fromSubject != null) {
            return fromSubject;
        }

        throw new ApiException(ErrorCode.UNAUTHENTICATED, "Token không chứa định danh người dùng hợp lệ");
    }

    private static UUID parseUuid(String raw) {
        if (raw == null || raw.isBlank()) {
            return null;
        }
        try {
            return UUID.fromString(raw.trim());
        } catch (IllegalArgumentException exception) {
            return null;
        }
    }
}
