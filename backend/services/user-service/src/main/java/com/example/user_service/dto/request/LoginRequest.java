package com.example.user_service.dto.request;

import lombok.Getter;
import lombok.Setter;

/**
 * Payload đăng nhập.
 *
 * <p>{@code username} nhận <b>username hoặc email</b> — xem
 * {@code CustomUserDetailsService} để biết cách tra cứu.
 */
@Getter
@Setter
public class LoginRequest {
    /** Username hoặc email của tài khoản. */
    private String username;

    private String password;
}
