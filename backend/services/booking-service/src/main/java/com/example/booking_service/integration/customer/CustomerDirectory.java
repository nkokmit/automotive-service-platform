package com.example.booking_service.integration.customer;

import com.example.booking_service.common.ApiResponse;
import com.example.booking_service.integration.support.IntegrationCallRetrier;
import com.example.booking_service.exception.ApiException;
import com.example.booking_service.exception.ErrorCode;
import feign.FeignException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.UUID;
import java.util.function.Supplier;

@Component
@RequiredArgsConstructor
@Slf4j
public class CustomerDirectory {

    private final CustomerDirectoryClient client;
    private final IntegrationCallRetrier retrier;

    public UUID requireActiveCustomer(UUID customerId) {
        CustomerProfileContract customer = read(() -> client.getCustomer(customerId), ErrorCode.CUSTOMER_NOT_FOUND);
        if (!Boolean.TRUE.equals(customer.isActive())) {
            throw new ApiException(ErrorCode.CUSTOMER_NOT_FOUND, "Hồ sơ khách hàng không hoạt động");
        }
        return customer.id();
    }

    /** Tìm khách theo số điện thoại chính xác, chưa có thì tạo hồ sơ mới (không gắn tài khoản). */
    public UUID findOrCreateByPhone(String fullName, String phone, String email) {
        CustomerCreateCommand command = new CustomerCreateCommand(
                fullName.strip(), normalizePhone(phone), blankToNull(email), true);
        CustomerProfileContract customer;
        try {
            customer = unwrap(client.findOrCreateCustomer(command), null);
        } catch (FeignException exception) {
            throw translate(exception, null);
        }
        if (customer.id() == null || !Boolean.TRUE.equals(customer.isActive())) {
            throw new ApiException(ErrorCode.CUSTOMER_NOT_FOUND, "Hồ sơ khách hàng không hoạt động");
        }
        return customer.id();
    }

    public VehicleContract requireActiveVehicle(UUID vehicleId) {
        VehicleContract vehicle = read(() -> client.getVehicle(vehicleId), ErrorCode.VEHICLE_NOT_FOUND);
        if (!Boolean.FALSE.equals(vehicle.isActive()) && vehicle.id() != null) {
            return vehicle;
        }
        throw new ApiException(ErrorCode.VEHICLE_NOT_FOUND, "Hồ sơ xe không hoạt động");
    }

    public static String normalizePhone(String phone) {
        return phone == null ? "" : phone.replaceAll("[\\s.\\-]", "");
    }

    public static String normalizePlate(String plate) {
        return plate == null ? "" : plate.replaceAll("[\\s.\\-]", "").toUpperCase();
    }

    private <T> T read(Supplier<ApiResponse<T>> call, ErrorCode notFound) {
        try {
            return unwrap(retrier.execute("customer-vehicle-service", call), notFound);
        } catch (FeignException exception) {
            throw translate(exception, notFound);
        }
    }

    private <T> T unwrap(ApiResponse<T> response, ErrorCode notFound) {
        if (response == null || response.code() != 0 || response.result() == null) {
            throw new ApiException(ErrorCode.INTEGRATION_SERVICE_UNAVAILABLE,
                    "customer-vehicle-service trả phản hồi không hợp lệ");
        }
        return response.result();
    }

    private ApiException translate(FeignException exception, ErrorCode notFound) {
        if (exception.status() == 404 && notFound != null) {
            return new ApiException(notFound);
        }
        if (exception.status() == 400 || exception.status() == 409) {
            return new ApiException(ErrorCode.INVALID_REQUEST, "Thông tin khách hàng không hợp lệ hoặc đã tồn tại");
        }
        log.error("Gọi customer-vehicle-service thất bại (HTTP {}): {}", exception.status(), exception.getMessage());
        return new ApiException(ErrorCode.INTEGRATION_SERVICE_UNAVAILABLE,
                "Không thể kết nối customer-vehicle-service, vui lòng thử lại sau");
    }

    private String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.strip();
    }
}
