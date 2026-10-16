package com.example.user_service.service;

import com.example.user_service.dto.response.UserResponse;
import com.example.user_service.entity.User;
import com.example.user_service.exception.UserNotFoundException;
import com.example.user_service.mapper.EntityMapper;
import com.example.user_service.repository.RoleRepository;
import com.example.user_service.repository.UserRepository;
import com.example.user_service.security.jwt.JwtService;
import com.example.user_service.security.service.RefreshTokenService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;

/**
 * Unit test cho {@link UserServiceImpl#getCurrentUser(String)}.
 *
 * <p>Dùng Mockito thay vì {@code @SpringBootTest} vì logic này chỉ cần repository +
 * mapper — không cần MySQL/Flyway, nên test chạy được kể cả khi DB chưa dựng.
 */
@ExtendWith(MockitoExtension.class)
class UserServiceImplTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private RoleRepository roleRepository;

    @Mock
    private EntityMapper entityMapper;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private JwtService jwtService;

    @Mock
    private RefreshTokenService refreshTokenService;

    @InjectMocks
    private UserServiceImpl userService;

    @Test
    void getCurrentUser_returnsProfileOfAuthenticatedUser() {
        String username = "admin";
        User user = User.builder()
                .id(UUID.randomUUID())
                .username(username)
                .email("admin@example.com")
                .fullName("Quản trị viên")
                .isActive(Boolean.TRUE)
                .build();
        UserResponse expected = new UserResponse(
                user.getId(), username, user.getEmail(), user.getFullName(), Boolean.TRUE, java.util.Set.of());

        given(userRepository.findByUsername(username)).willReturn(Optional.of(user));
        given(entityMapper.toUserResponse(user)).willReturn(expected);

        UserResponse result = userService.getCurrentUser(username);

        assertThat(result).isEqualTo(expected);
        assertThat(result.username()).isEqualTo(username);
        verify(userRepository).findByUsername(username);
    }

    @Test
    void getCurrentUser_throwsWhenUserNotFound() {
        String username = "ghost";
        given(userRepository.findByUsername(username)).willReturn(Optional.empty());

        assertThatThrownBy(() -> userService.getCurrentUser(username))
                .isInstanceOf(UserNotFoundException.class)
                .hasMessageContaining(username);
    }
}