package com.example.inventory_service.common;

import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;

import java.util.Set;

/**
 * Tạo {@link Pageable} từ tham số phân trang của API.
 *
 * <p>Client gửi {@code page}, {@code size}, {@code sortBy}, {@code sortDirection}.
 * Hai tham số sort là input không kiểm soát được nên phải chốt chặn:
 *
 * <ul>
 *   <li>{@code sortBy} chỉ được nằm trong whitelist cột của resource, nếu
 *       không thì rơi về cột mặc định. Nếu không whitelist, Spring Data sẽ ném
 *       {@code PropertyReferenceException} và client nhận 500 thay vì 400.</li>
 *   <li>{@code sortDirection} chỉ nhận {@code ASC}/{@code DESC} (không phân
 *       biệt hoa thường), sai thì mặc định {@code ASC}.</li>
 * </ul>
 */
public final class PageableFactory {

    private PageableFactory() {
    }

    /**
     * @param page              trang 0-based
     * @param size              số phần tử mỗi trang
     * @param sortBy             tên cột do client gửi, có thể null
     * @param sortDirection     {@code ASC}/{@code DESC}, có thể null
     * @param allowedSortFields  whitelist tên cột hợp lệ
     * @param defaultSortBy      cột dùng khi client gửi tên cột không hợp lệ
     */
    public static Pageable of(int page,
                              int size,
                              String sortBy,
                              String sortDirection,
                              Set<String> allowedSortFields,
                              String defaultSortBy) {
        String field = (sortBy != null && allowedSortFields.contains(sortBy.trim()))
                ? sortBy.trim()
                : defaultSortBy;

        Sort.Direction direction = Sort.Direction.ASC;
        if (sortDirection != null && !sortDirection.isBlank()) {
            try {
                direction = Sort.Direction.fromString(sortDirection.trim());
            } catch (IllegalArgumentException exception) {
                direction = Sort.Direction.ASC;
            }
        }

        return PageRequest.of(page, size, Sort.by(direction, field));
    }
}
