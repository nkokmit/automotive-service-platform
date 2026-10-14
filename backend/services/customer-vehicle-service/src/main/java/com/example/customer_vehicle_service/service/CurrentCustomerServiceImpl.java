package com.example.customer_vehicle_service.service;

import com.example.customer_vehicle_service.entity.Customer;
import com.example.customer_vehicle_service.exception.CustomerProfileUnresolvedException;
import com.example.customer_vehicle_service.repository.CustomerRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class CurrentCustomerServiceImpl implements CurrentCustomerService {

    /**
     * Claim {@code userId} do user-service sinh trong access token.
     * Xem {@code JwtService#generateToken} của user-service.
     */
    private static final String USER_ID_CLAIM = "userId";

    private final CustomerRepository customerRepository;

    @Override
    @Transactional(readOnly = true)
    public UUID getRequiredCustomerId() {
        UUID userId = extractUserIdClaim();

        // findByUserId chịu @SQLRestriction nên hồ sơ đã xoá mềm không lấy được,
        // đồng nghĩa token còn hợp lệ nhưng hồ sơ đã bị thu hồi quyền.
        Customer customer = customerRepository.findByUserId(userId)
                .orElseThrow(() -> new CustomerProfileUnresolvedException(
                        "Tài khoản chưa được liên kết với hồ sơ khách hàng"));

        log.debug("Caller {} được ánh xạ tới khách hàng {}",
                SecurityContextHolder.getContext().getAuthentication().getName(), customer.getId());
        return customer.getId();
    }

    /**
     * Đọc claim {@code userId} từ JWT của SecurityContext.
     *
     * <p>Token cũ phát hành trước khi thêm claim này sẽ thiếu claim và bị từ
     * chối ở đây — chấp nhận được: token hết hạn rồi mới cấp lại. Fail closed
     * quan trọng hơn là suy đoán danh tính.
     *
     * <p>Cả ba nhánh từ chối đều ném {@link CustomerProfileUnresolvedException}
     * vì không nhánh nào phản ánh thiếu quyền của caller — chỉ là chưa xác định
     * được hồ sơ là của ai. Xem javadoc của exception để hiểu vì sao vẫn là 403.
     */
    private UUID extractUserIdClaim() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

        if (authentication == null || !authentication.isAuthenticated()
                || !(authentication instanceof JwtAuthenticationToken jwtAuthenticationToken)) {
            throw new CustomerProfileUnresolvedException("Yêu cầu cần token hợp lệ của khách hàng");
        }

        Jwt token = jwtAuthenticationToken.getToken();
        String rawUserId = token.getClaimAsString(USER_ID_CLAIM);
        if (rawUserId == null || rawUserId.isBlank()) {
            throw new CustomerProfileUnresolvedException("Token không có claim userId");
        }

        try {
            return UUID.fromString(rawUserId);
        } catch (IllegalArgumentException ex) {
            // Token ký đúng nhưng claim sai định dạng: dấu hiệu token được sinh
            // từ nguồn khác. Log cảnh báo rồi từ chối, không ném lỗi 500.
            log.warn("Claim userId không phải UUID hợp lệ: {}", rawUserId);
            throw new CustomerProfileUnresolvedException("Claim userId không hợp lệ");
        }
    }
}