package com.example.user_service.controller;

import com.example.user_service.common.ApiResponse;
import com.example.user_service.dto.request.UserCreateRequest;
import com.example.user_service.dto.request.UserUpdateRequest;
import com.example.user_service.dto.response.PageResponse;
import com.example.user_service.dto.response.UserResponse;
import com.example.user_service.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.Set;
import java.util.UUID;

/**
 * CRUD API cho User. Controller mỏng — chỉ validate request và gọi service.
 */
@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    @GetMapping
    public ApiResponse<PageResponse<UserResponse>> getAllUsers(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "createdAt") String sortBy,
            @RequestParam(defaultValue = "DESC") String sortDirection
    ) {
        Sort sort = Sort.by(Sort.Direction.fromString(sortDirection), sortBy);
        Pageable pageable = PageRequest.of(page, size, sort);
        return ApiResponse.success(userService.getAllUsers(pageable));
    }

    @GetMapping("/{id}")
    public ApiResponse<UserResponse> getUserById(@PathVariable UUID id) {
        return ApiResponse.success(userService.getUserById(id));
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<UserResponse> createUser(@Valid @RequestBody UserCreateRequest request) {
        return ApiResponse.success("Tạo người dùng thành công", userService.createUser(request));
    }

    @PutMapping("/{id}")
    public ApiResponse<UserResponse> updateUser(
            @PathVariable UUID id,
            @Valid @RequestBody UserUpdateRequest request
    ) {
        return ApiResponse.success("Cập nhật người dùng thành công", userService.updateUser(id, request));
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteUser(@PathVariable UUID id) {
        userService.deleteUser(id);
    }

    @PostMapping("/{id}/roles")
    public ApiResponse<UserResponse> assignRoles(@PathVariable UUID id, @RequestBody Set<UUID> roleIds) {
        return ApiResponse.success("Gán role thành công", userService.assignRoles(id, roleIds));
    }

    @DeleteMapping("/{id}/roles/{roleId}")
    public ApiResponse<UserResponse> removeRole(@PathVariable UUID id, @PathVariable UUID roleId) {
        return ApiResponse.success("Gỡ role thành công", userService.removeRole(id, roleId));
    }
}
