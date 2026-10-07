package com.example.user_service.controller;

import com.example.user_service.common.ApiResponse;
import com.example.user_service.dto.request.LoginRequest;
import com.example.user_service.dto.request.RefreshTokenRequest;
import com.example.user_service.dto.response.LoginResponse;
import com.example.user_service.dto.response.RefreshTokenResponse;
import com.example.user_service.entity.RefreshToken;
import com.example.user_service.entity.User;
import com.example.user_service.exception.UserNotFoundException;
import com.example.user_service.repository.UserRepository;
import com.example.user_service.security.jwt.JwtService;
import com.example.user_service.security.service.RefreshTokenService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Map;


@RestController
@RequiredArgsConstructor
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthenticationManager authenticationManager;

    private final JwtService jwtService;

    private final RefreshTokenService refreshTokenService;

    private final UserRepository userRepository;

    @PostMapping("/login")
    public ApiResponse<LoginResponse> login(@RequestBody LoginRequest loginRequest) {
        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(
                        loginRequest.getUsername(),
                        loginRequest.getPassword()
                )
        );

        User user = (User) authentication.getPrincipal();
        String accessToken = jwtService.generateToken(user);
        String refreshToken = refreshTokenService.createRefreshToken(user.getId());
        return ApiResponse.success( LoginResponse.builder()
                        .accessToken(accessToken)
                        .refreshToken(refreshToken)
                        .build()
        );
    }

    @PostMapping("/refresh-token")
    public ApiResponse<RefreshTokenResponse> refreshToken(@RequestBody RefreshTokenRequest request) {
        String rawToken = request.getRawToken();
        if (rawToken == null) {
            throw new RuntimeException("Refresh token not null");
        }

        RefreshToken refreshToken = refreshTokenService.findByToken(rawToken)
                .orElseThrow(() -> new RuntimeException("Refresh don't exist"));

        if (refreshToken.isRevoked()) {
            throw new RuntimeException("Refresh token revoked");
        }

        RefreshToken verifiedToken = refreshTokenService.verifyExpiration(rawToken);
        User user = verifiedToken.getUser();
        String newAccessToken = jwtService.generateToken(user);

        return ApiResponse.success(RefreshTokenResponse.builder()
                .accessToken(newAccessToken)
                .build());
    }

    @PostMapping("/logout")
    public ApiResponse<Void> logout(@RequestHeader("Authorization") String authorization) {
        String token = authorization.substring(7);
        String username = jwtService.extractUsername(token);
        User user = userRepository.findByUsername(username).orElseThrow(() -> new UserNotFoundException("Không tìm thấy người dùng"));
        refreshTokenService.revokeAllUserToken(user.getId());
        return ApiResponse.success("Đăng xuất thành công", null);
    }
}
