package com.example.user_service.service;

import com.example.user_service.dto.request.UserCreateRequest;
import com.example.user_service.dto.request.UserUpdateRequest;
import com.example.user_service.dto.response.PageResponse;
import com.example.user_service.dto.response.UserResponse;
import com.example.user_service.entity.Role;
import com.example.user_service.entity.User;
import com.example.user_service.exception.RoleNotFoundException;
import com.example.user_service.exception.UserAlreadyExistsException;
import com.example.user_service.exception.UserNotFoundException;
import com.example.user_service.mapper.EntityMapper;
import com.example.user_service.repository.RoleRepository;
import com.example.user_service.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class UserServiceImpl implements UserService {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final EntityMapper entityMapper;
    private final PasswordEncoder passwordEncoder;

    @Override
    @Transactional(readOnly = true)
    public PageResponse<UserResponse> getAllUsers(Pageable pageable) {
        Page<User> page = userRepository.findAll(pageable);
        return PageResponse.from(page, entityMapper::toUserResponse);
    }

    @Override
    @Transactional(readOnly = true)
    public UserResponse getUserById(UUID id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new UserNotFoundException("Không tìm thấy người dùng với id: " + id));
        return entityMapper.toUserResponse(user);
    }

    @Override
    public UserResponse createUser(UserCreateRequest request) {
        validateUniqueUsernameAndEmail(request.username(), request.email(), null);

        Set<Role> roles = resolveRoles(request.roleIds());

        User user = User.builder()
                .username(request.username())
                .password(passwordEncoder.encode(request.password()))
                .email(request.email())
                .fullName(request.fullName())
                .isActive(request.isActive() == null ? Boolean.TRUE : request.isActive())
                .roles(roles)
                .build();

        User saved = userRepository.save(user);
        log.info("Đã tạo user mới: {}", saved.getUsername());
        return entityMapper.toUserResponse(saved);
    }

    @Override
    public UserResponse updateUser(UUID id, UserUpdateRequest request) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new UserNotFoundException("Không tìm thấy người dùng với id: " + id));

        if (request.username() != null && !request.username().equals(user.getUsername())) {
            validateUniqueUsernameAndEmail(request.username(), null, id);
            user.setUsername(request.username());
        }
        if (request.email() != null && !request.email().equals(user.getEmail())) {
            validateUniqueUsernameAndEmail(null, request.email(), id);
            user.setEmail(request.email());
        }
        if (request.fullName() != null) {
            user.setFullName(request.fullName());
        }
        if (request.password() != null && !request.password().isBlank()) {
            user.setPassword(passwordEncoder.encode(request.password()));
        }
        if (request.isActive() != null) {
            user.setIsActive(request.isActive());
        }
        if (request.roleIds() != null) {
            user.setRoles(resolveRoles(request.roleIds()));
        }

        User saved = userRepository.save(user);
        log.info("Đã cập nhật user: {}", saved.getUsername());
        return entityMapper.toUserResponse(saved);
    }

    @Override
    public void deleteUser(UUID id) {
        // Dùng native query để bypass @SQLRestriction — idempotent nếu user đã bị xoá trước đó.
        User user = userRepository.findByIdRaw(id)
                .orElseThrow(() -> new UserNotFoundException("Không tìm thấy người dùng với id: " + id));

        if (user.getDeletedAt() != null) {
            log.info("User {} đã được xoá trước đó — bỏ qua (idempotent)", id);
            return;
        }
        user.setDeletedAt(Instant.now());
        user.setIsActive(Boolean.FALSE);
        userRepository.save(user);
        log.info("Đã soft delete user: {}", id);
    }

    @Override
    public UserResponse assignRoles(UUID userId, Set<UUID> roleIds) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new UserNotFoundException("Không tìm thấy người dùng với id: " + userId));
        user.setRoles(resolveRoles(roleIds));
        User saved = userRepository.save(user);
        log.info("Đã gán {} roles cho user {}", roleIds.size(), userId);
        return entityMapper.toUserResponse(saved);
    }

    @Override
    public UserResponse removeRole(UUID userId, UUID roleId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new UserNotFoundException("Không tìm thấy người dùng với id: " + userId));

        boolean removed = user.getRoles().removeIf(r -> r.getId().equals(roleId));
        if (!removed) {
            throw new RoleNotFoundException("User không có role với id: " + roleId);
        }
        User saved = userRepository.save(user);
        log.info("Đã gỡ role {} khỏi user {}", roleId, userId);
        return entityMapper.toUserResponse(saved);
    }

    // ===== Helpers =====

    private void validateUniqueUsernameAndEmail(String username, String email, UUID excludeUserId) {
        if (username != null) {
            boolean exists = excludeUserId == null
                    ? userRepository.existsByUsername(username)
                    : userRepository.findByUsername(username)
                        .map(u -> !u.getId().equals(excludeUserId))
                        .orElse(false);
            if (exists) {
                throw new UserAlreadyExistsException("Username đã tồn tại: " + username);
            }
        }
        if (email != null) {
            boolean exists = excludeUserId == null
                    ? userRepository.existsByEmail(email)
                    : userRepository.findByEmail(email)
                        .map(u -> !u.getId().equals(excludeUserId))
                        .orElse(false);
            if (exists) {
                throw new UserAlreadyExistsException("Email đã tồn tại: " + email);
            }
        }
    }

    private Set<Role> resolveRoles(Set<UUID> roleIds) {
        if (roleIds == null || roleIds.isEmpty()) {
            return new HashSet<>();
        }
        List<Role> roles = roleRepository.findAllById(roleIds);
        if (roles.size() != roleIds.size()) {
            Set<UUID> foundIds = roles.stream().map(Role::getId).collect(Collectors.toSet());
            List<UUID> missing = roleIds.stream().filter(rid -> !foundIds.contains(rid)).toList();
            throw new RoleNotFoundException("Không tìm thấy role id: " + missing);
        }
        return new HashSet<>(roles);
    }
}

