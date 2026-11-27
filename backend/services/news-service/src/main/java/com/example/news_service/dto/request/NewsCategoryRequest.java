package com.example.news_service.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Payload tạo/sửa danh mục bài viết — khớp {@code NewsCategoryRequest.java}.
 */
public record NewsCategoryRequest(
        @NotBlank(message = "Mã danh mục không được để trống")
        @Size(max = 30, message = "Mã danh mục tối đa 30 ký tự")
        String code,

        @NotBlank(message = "Tên danh mục không được để trống")
        @Size(max = 100, message = "Tên danh mục tối đa 100 ký tự")
        String name,

        @Size(max = 2000, message = "Mô tả tối đa 2000 ký tự")
        String description
) {
}
