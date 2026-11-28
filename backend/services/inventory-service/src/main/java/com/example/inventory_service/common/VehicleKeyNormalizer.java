package com.example.inventory_service.common;

import java.util.Locale;

public final class VehicleKeyNormalizer {

    public static final String ALL = "ALL";

    private VehicleKeyNormalizer() {
    }

    public static String normalize(String value) {
        String trimmed = TextUtils.trimToNull(value);
        return trimmed == null ? ALL : trimmed.toUpperCase(Locale.ROOT);
    }
}
