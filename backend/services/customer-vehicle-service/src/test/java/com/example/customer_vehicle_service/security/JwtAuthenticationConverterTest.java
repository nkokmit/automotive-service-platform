package com.example.customer_vehicle_service.security;

import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.AbstractAuthenticationToken;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.oauth2.jwt.Jwt;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class JwtAuthenticationConverterTest {

    private final JwtAuthenticationConverter converter = new JwtAuthenticationConverter();

    @Test
    void convertPreservesAuthoritiesWithoutAddingPrefix() {
        Jwt jwt = Jwt.withTokenValue("test-token")
                .header("alg", "HS256")
                .subject("admin")
                .claim("authorities", List.of("USER_READ", "ROLE_ADMIN"))
                .build();

        AbstractAuthenticationToken authentication = converter.convert(jwt);

        assertEquals("admin", authentication.getName());
        assertTrue(authentication.isAuthenticated());
        assertEquals(List.of("USER_READ", "ROLE_ADMIN"), authentication.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .toList());
    }

    @Test
    void convertAuthenticatesTokenWithoutAuthoritiesClaim() {
        Jwt jwt = Jwt.withTokenValue("test-token")
                .header("alg", "HS256")
                .subject("customer")
                .build();

        AbstractAuthenticationToken authentication = converter.convert(jwt);

        assertEquals("customer", authentication.getName());
        assertTrue(authentication.isAuthenticated());
        assertTrue(authentication.getAuthorities().isEmpty());
    }
}
