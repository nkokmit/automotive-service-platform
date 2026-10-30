package com.example.inventory_service.common;

import org.springframework.data.domain.Page;

import java.util.List;
import java.util.function.Function;

/**
 * Wrapper cho phân trang, dùng chung cho mọi API có danh sách.
 *
 * <p>Cấu trúc này giống {@code staff-service/dto/response/PageResponse.java}
 * để client xử lý thống nhất giữa các service.
 *
 * @param <T> kiểu phần tử trả về cho client
 */
public record PageResponse<T>(
        List<T> items,
        int page,
        int size,
        long totalElements,
        int totalPages,
        boolean hasNext,
        boolean hasPrevious
) {
    public static <S, T> PageResponse<T> from(Page<S> page, Function<S, T> mapper) {
        return new PageResponse<>(
                page.getContent().stream().map(mapper).toList(),
                page.getNumber(),
                page.getSize(),
                page.getTotalElements(),
                page.getTotalPages(),
                page.hasNext(),
                page.hasPrevious()
        );
    }
}
