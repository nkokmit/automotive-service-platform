package com.example.user_service.security.service;

import com.example.user_service.dto.response.RefreshTokenResponse;
import com.example.user_service.entity.RefreshToken;
import com.example.user_service.entity.User;
import com.example.user_service.exception.UserNotFoundException;
import com.example.user_service.repository.AuthUserRepository;
import com.example.user_service.repository.RefreshTokenRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;

import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class RefreshTokenService {

    @Value("${jwt.refresh-expiration}")
    private Long refreshTokenExpirationMs;

    private final RefreshTokenRepository refreshTokenRepository;

    private final AuthUserRepository authUserRepository;
    /**
     * Tạo Refresh Token mới cho User
     */
    @Transactional
    public String createRefreshToken(UUID userId) {
        User user = authUserRepository.findById(userId).orElseThrow(() -> new UserNotFoundException("Không tìm thấy người dùng"));
        refreshTokenRepository.deleteAllByUserId(userId);

        String rawToken = UUID.randomUUID().toString() + "-" + UUID.randomUUID().toString();
        String tokenHash = hash(rawToken);
        Instant expiryDate = Instant.now().plusMillis(refreshTokenExpirationMs);

        RefreshToken refreshToken = RefreshToken.builder()
                .user(user)
                .tokenHash(tokenHash)
                .expiryDate(expiryDate)
                .isRevoked(false)
                .createdAt(Instant.now())
                .build();
        refreshTokenRepository.save(refreshToken);
        return rawToken;
    }

    public Optional<RefreshToken> findByToken(String token) {
        String tokenHash = hash(token);
        return refreshTokenRepository.findByTokenHash(tokenHash);
    }

    public RefreshToken verifyExpiration(String rawToken){
        String tokenHash = hash(rawToken);

        RefreshToken refreshToken = refreshTokenRepository.findByTokenHash(tokenHash)
                .orElseThrow(() -> new RuntimeException("Refresh Token không hợp lệ"));
        if (refreshToken.getExpiryDate().compareTo(Instant.now()) < 0) {
            refreshToken.setRevoked(true);
            refreshTokenRepository.save(refreshToken);
            throw new RuntimeException("Refresh token expiry!");
        }

        return refreshToken;
    }

    @Transactional
    public void revokeAllUserToken(UUID userId) {
        refreshTokenRepository.deleteAllByUserId(userId);
    }

    private static String hash(String rawInput) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] encodedhash = digest.digest(rawInput.getBytes(StandardCharsets.UTF_8));
            return bytesToHex(encodedhash);
        } catch (NoSuchAlgorithmException e) {
            throw new RuntimeException("Lỗi khi băm token với thuật toán SHA-256", e);
        }
    }

    private static String bytesToHex(byte[] hash) {
        StringBuilder hexString = new StringBuilder(2 * hash.length);
        for (byte b : hash) {
            String hex = Integer.toHexString(0xff & b);
            if (hex.length() == 1) {
                hexString.append('0');
            }
            hexString.append(hex);
        }
        return hexString.toString();
    }
}