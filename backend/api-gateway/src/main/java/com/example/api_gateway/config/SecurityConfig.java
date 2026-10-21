package com.example.api_gateway.config;

import com.example.api_gateway.exception.SecurityErrorHandler;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
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