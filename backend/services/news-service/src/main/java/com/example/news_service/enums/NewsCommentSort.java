package com.example.news_service.enums;

/**
 * Cách sắp xếp danh sách bình luận.
 *
 * <p>Dùng cho query param {@code sort} của endpoint đọc bình luận.
 */
public enum NewsCommentSort {

    /** Mới nhất trước. */
    NEWEST("newest"),

    /** Cũ nhất trước — mặc định, giữ đúng luồng hội thoại. */
    OLDEST("oldest"),

    /** Nhiều lượt thích nhất trước. */
    MOST_LIKED("mostLiked");

    private final String value;

    NewsCommentSort(String value) {
        this.value = value;
    }

    /** Chuỗi dùng trong query param. */
    public String getValue() {
        return value;
    }

    /**
     * Chuyển chuỗi từ client thành enum — sai thì trả {@code null} để
     * service áp dụng mặc định.
     *
     * @param raw giá trị query param (không phân biệt hoa thường)
     */
    public static NewsCommentSort fromRaw(String raw) {
        if (raw == null || raw.isBlank()) {
            return null;
        }
        String normalized = raw.trim();
        for (NewsCommentSort candidate : values()) {
            if (candidate.value.equalsIgnoreCase(normalized)
                    || candidate.name().equalsIgnoreCase(normalized)) {
                return candidate;
            }
        }
        return null;
    }
}
