package com.example.inventory_service.common;

public final class TextUtils {

    private TextUtils() {
    }

    /**
     * @return chuỗi đã trim, hoặc {@code null} nếu đầu vào null/rỗng/chỉ có khoảng trắng.
     */
    public static String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
