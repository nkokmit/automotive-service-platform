package com.example.api_gateway.config;

import com.example.api_gateway.exception.SecurityErrorHandler;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.reactive.EnableWebFluxSecurity;
import org.springframework.security.config.web.server.ServerHttpSecurity;
import org.springframework.security.web.server.SecurityWebFilterChain;

@Configuration
@EnableWebFluxSecurity
public class SecurityConfig {

    @Bean
    public SecurityWebFilterChain securityWebFilterChain(
            ServerHttpSecurity http,
            SecurityErrorHandler securityErrorHandler
    ) {

        return http
                .csrf(ServerHttpSecurity.CsrfSpec::disable)

                // 401/403 phải trả body đúng ApiResponse contract, không trả
                // body rỗng mặc định của Spring (GLOBAL_RULES §15).
                .exceptionHandling(exceptions -> exceptions
                        .authenticationEntryPoint(securityErrorHandler)
                        .accessDeniedHandler(securityErrorHandler))

                .authorizeExchange(exchange -> exchange

                        // Authentication endpoints
                        .pathMatchers(
                                "/api/auth/**"
                        ).permitAll()

                        // ── Catalog công khai ──────────────────────────────────────
                        // Khách chưa đăng nhập vẫn xem được danh mục dịch vụ và phụ
                        // tùng (trang /services, /parts của storefront là trang public).
                        // Chỉ GET — mọi thao tác ghi vẫn đi qua xác thực ở service.
                        .pathMatchers(HttpMethod.GET,
                                "/api/services/**",
                                "/api/service-categories/**",
                                "/api/parts/**",
                                "/api/part-categories/**"
                        ).permitAll()

                        // ── Tin tức công khai ─────────────────────────────────────────
                        // Khách chưa đăng nhập vẫn đọc được tin tức, danh mục bài
                        // viết và bình luận. Chỉ GET — mọi thao tác ghi (đăng bài,
                        // quản lý danh mục, kiểm duyệt bình luận) đi qua xác thực
                        // và phân quyền ở news-service.
                        .pathMatchers(HttpMethod.GET,
                                "/api/news-articles/**",
                                "/api/news-categories/**",
                                "/api/news-comments/**",
                                // Ảnh bài viết là tài nguyên tĩnh, hiển thị
                                // trong bài cho cả khách chưa đăng nhập.
                                "/api/news-images/**"
                        ).permitAll()

                        // Only health is public; other Actuator endpoints stay protected.
                        .pathMatchers("/actuator/health/**").permitAll()

                        // Swagger
                        .pathMatchers(
                                "/swagger-ui.html",
                                "/swagger-ui/**",
                                "/v3/api-docs/**",
                                "/webjars/**"
                        ).permitAll()

                        // Everything else
                        .anyExchange().authenticated()
                )

                .oauth2ResourceServer(oauth2 ->
                        oauth2.jwt(jwt -> {})
                )

                .build();
    }
}