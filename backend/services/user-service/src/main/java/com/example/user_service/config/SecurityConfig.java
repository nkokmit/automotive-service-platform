package com.example.user_service.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;

/**
 * Cấu hình Security tạm thời cho user-service.
 *
 * <p><b>LƯU Ý BẢO MẬT:</b> Hệ thống hiện chưa có Authentication Server (Keycloak/JWT)
 * theo CONTEXT.md (mục 11 chưa xác định cơ chế auth). Toàn bộ endpoint {@code /api/**}
 * tạm thời permitAll để phục vụ phát triển/test CRUD. Đây là endpoint ghi dữ liệu người
 * dùng (bao gồm cả role/permission) nên KHÔNG được dùng ở môi trường production khi chưa
 * có lớp xác thực/phân quyền (JWT, API Gateway filter, v.v.).
 */
@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
                .csrf(csrf -> csrf.disable())
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                        .anyRequest().permitAll()
                );
        return http.build();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }
}
