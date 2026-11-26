package com.example.user_service.security.custom;

import com.example.user_service.repository.AuthUserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

/**
 * Nạp user theo "tài khoản đăng nhập".
 *
 * <p>Người dùng có thể đăng nhập bằng <b>username</b> hoặc <b>email</b> — hai giá
 * trị này đều là duy nhất trong bảng {@code users}. Vì vậy ta thử theo username
 * trước; nếu không có thì thử theo email.
 *
 * <p>Thông điệp lỗi luôn chung chung ("User not found") để không lộ ra email
 * nào tồn tại trong hệ thống.
 */
@Service
public class CustomUserDetailsService implements UserDetailsService {

    @Autowired
    private AuthUserRepository authUserRepository;

    @Override
    public UserDetails loadUserByUsername(String usernameOrEmail) throws UsernameNotFoundException {
        String identifier = usernameOrEmail == null ? "" : usernameOrEmail.trim();

        return authUserRepository.findByUsername(identifier)
                .or(() -> authUserRepository.findByEmail(identifier))
                .orElseThrow(() -> new UsernameNotFoundException("User not found: " + usernameOrEmail));
    }
}
