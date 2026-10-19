package com.example.user_service.service;

import com.example.user_service.dto.response.UserResponse;
import com.example.user_service.dto.request.UserCreateRequest;
import com.example.user_service.dto.request.RegisterRequest;
import com.example.user_service.entity.User;
import com.example.user_service.exception.UserEmailAlreadyExistsException;
import com.example.user_service.exception.UserNotFoundException;
import com.example.user_service.exception.UserPhoneAlreadyExistsException;
import com.example.user_service.dto.response.AuthenticationResponse;
import com.example.user_service.entity.Role;
import com.example.user_service.mapper.EntityMapper;
import com.example.user_service.event.UserRegisteredEvent;
import com.example.user_service.repository.RoleRepository;
import com.example.user_service.repository.UserRepository;
import com.example.user_service.security.jwt.JwtService;
import com.example.user_service.security.service.RefreshTokenService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.ArgumentMatchers.any;

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

    @Mock
    private ApplicationEventPublisher eventPublisher;

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
                user.getId(), username, user.getEmail(), user.getPhone(),
                user.getFullName(), Boolean.TRUE, java.util.Set.of());

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

    @Test
    void createUser_rejectsEmailUsedBySoftDeletedAccount() {
        UserCreateRequest request = new UserCreateRequest(
                "new-user", "password", "old@example.com", "0901234567",
                "New User", true, java.util.Set.of());
        given(userRepository.existsByUsername(request.username())).willReturn(false);
        given(userRepository.countByEmailIncludingDeleted(request.email())).willReturn(1L);

        assertThatThrownBy(() -> userService.createUser(request))
                .isInstanceOf(UserEmailAlreadyExistsException.class);

        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    void createUser_rejectsDuplicatePhone() {
        UserCreateRequest request = new UserCreateRequest(
                "new-user", "password", "new@example.com", "0901234567",
                "New User", true, java.util.Set.of());
        given(userRepository.existsByUsername(request.username())).willReturn(false);
        given(userRepository.countByEmailIncludingDeleted(request.email())).willReturn(0L);
        given(userRepository.countByPhoneIncludingDeleted(request.phone())).willReturn(1L);

        assertThatThrownBy(() -> userService.createUser(request))
                .isInstanceOf(UserPhoneAlreadyExistsException.class);

        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    void registerUser_publishesRegistrationEventAndIssuesTokens() {
        RegisterRequest request = new RegisterRequest(
                "new-customer", "password", "new@example.com", "0901234567", "New Customer");
        Role customerRole = Role.builder().name("CUSTOMER").build();
        User savedUser = User.builder()
                .id(UUID.randomUUID())
                .username(request.username())
                .email(request.email())
                .phone(request.phone())
                .build();
        AuthenticationResponse expected = AuthenticationResponse.builder()
                .accessToken("access-token")
                .refreshToken("refresh-token")
                .build();

        given(userRepository.existsByUsername(request.username())).willReturn(false);
        given(userRepository.countByEmailIncludingDeleted(request.email())).willReturn(0L);
        given(userRepository.countByPhoneIncludingDeleted(request.phone())).willReturn(0L);
        given(roleRepository.findByName("CUSTOMER")).willReturn(Optional.of(customerRole));
        given(passwordEncoder.encode(request.password())).willReturn("encoded-password");
        given(userRepository.save(any(User.class))).willReturn(savedUser);
        given(jwtService.generateToken(savedUser)).willReturn("access-token");
        given(refreshTokenService.createRefreshToken(savedUser.getId())).willReturn("refresh-token");

        AuthenticationResponse result = userService.registerUser(request);

        assertThat(result).isEqualTo(expected);
        verify(eventPublisher).publishEvent(new UserRegisteredEvent(
                savedUser.getId(), savedUser.getUsername(), savedUser.getFullName(),
                savedUser.getEmail(), savedUser.getPhone()));
    }
}