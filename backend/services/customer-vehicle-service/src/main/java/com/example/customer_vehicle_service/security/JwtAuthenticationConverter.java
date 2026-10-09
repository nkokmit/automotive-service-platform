package com.example.customer_vehicle_service.security;

import org.springframework.core.convert.converter.Converter;
import org.springframework.security.authentication.AbstractAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;

import java.util.Collections;
import java.util.List;

/**
 * Servlet tương đương {@code JwtAuthenticationConverter} của api-gateway.
 *
 * <p>Cùng đọc claim {@code authorities} để {@code @PreAuthorize("hasAuthority(...)")}
 * dùng đúng tên quyền mà user-service đã cấp trong token. Token không có claim
 * này vẫn xác thực được - chỉ không có quyền nào, nên mọi rule yêu cầu quyền
 * sẽ trả 403 thay vì 401.
 */
public class JwtAuthenticationConverter
        implements Converter<Jwt, AbstractAuthenticationToken> {

    @Override
    public AbstractAuthenticationToken convert(Jwt jwt) {

        List<String> authorities =
                jwt.getClaimAsStringList("authorities");

        if (authorities == null) {
            authorities = Collections.emptyList();
        }

        List<SimpleGrantedAuthority> grantedAuthorities =
                authorities.stream()
                        .map(SimpleGrantedAuthority::new)
                        .toList();

        return new JwtAuthenticationToken(
                jwt,
                grantedAuthorities,
                jwt.getSubject()
        );
    }
}