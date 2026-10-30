package com.example.booking_service.security;

import org.springframework.core.convert.converter.Converter;
import org.springframework.security.authentication.AbstractAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;

import java.util.Collections;
import java.util.List;

public class JwtAuthenticationConverter implements Converter<Jwt, AbstractAuthenticationToken> {
    @Override
    public AbstractAuthenticationToken convert(Jwt jwt) {
        List<String> authorities = jwt.getClaimAsStringList("authorities");
        if (authorities == null) authorities = Collections.emptyList();
        List<SimpleGrantedAuthority> granted = authorities.stream()
                .map(SimpleGrantedAuthority::new).toList();
        return new JwtAuthenticationToken(jwt, granted, jwt.getSubject());
    }
}
