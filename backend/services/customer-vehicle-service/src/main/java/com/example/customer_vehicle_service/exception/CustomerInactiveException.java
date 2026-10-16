package com.example.customer_vehicle_service.exception;

/**
 * Khách hàng tồn tại nhưng đã bị vô hiệu hoá ({@code is_active = false}).
 *
 * <p>Tách khỏi {@code CustomerNotFoundException} vì hai trường hợp này gợi ý
 * hành động khác nhau: không tìm thấy là nhập sai id, còn không hoạt động thì
 * hồ sơ vẫn còn nhưng không được gắn xe mới hay nhận chuyển xe (PLAN.md bước 4).
 *
 * <p>Hồ sơ đã xoá mềm không tới được case này — {@code @SQLRestriction} ở entity
 * {@code Customer} khiến {@code findById} trả rỗng, nên nó thuộc về
 * {@code CustomerNotFoundException}.
 */
public class CustomerInactiveException extends ApiException {

    public CustomerInactiveException(String message) {
        super(ErrorCode.CUSTOMER_INACTIVE, message);
    }
}