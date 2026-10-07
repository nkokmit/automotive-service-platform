package com.example.api_gateway.security;

import org.springframework.core.convert.converter.Converter;
import org.springframework.security.authentication.AbstractAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import reactor.core.publisher.Mono;

import java.util.Collections;
import java.util.List;

public class JwtAuthenticationConverter
        implements Converter<Jwt, Mono<AbstractAuthenticationToken>> {


    @Override
    public Mono<AbstractAuthenticationToken> convert(Jwt jwt) {

        List<String> authorities =
                jwt.getClaimAsStringList("authorities");

        if (authorities == null) {
            authorities = Collections.emptyList();
        }

        List<SimpleGrantedAuthority> grantedAuthorities =
                authorities.stream()
                        .map(SimpleGrantedAuthority::new)
                        .toList();

        AbstractAuthenticationToken authentication =
                new JwtAuthenticationToken(
                        jwt,
                        grantedAuthorities,
                        jwt.getSubject()
                );

        return Mono.just(authentication);
    }
}