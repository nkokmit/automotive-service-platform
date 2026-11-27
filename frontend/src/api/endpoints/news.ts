/**
 * Endpoint client cho `news-service` — tin tức (danh mục + bài viết + bình luận).
 *
 * Yêu cầu authority:
 *  - `NEWS_CATEGORY_READ` / `NEWS_CATEGORY_WRITE` cho /api/news-categories
 *  - `NEWS_ARTICLE_READ`   / `NEWS_ARTICLE_WRITE`   cho /api/news-articles
 *  - `NEWS_COMMENT_READ`   / `NEWS_COMMENT_CREATE`  / `NEWS_COMMENT_MODERATE`
 *                                               cho /api/news-comments
 *
 * Lưu ý: các endpoint GET (đọc bài viết, danh mục, bình luận) được gateway
 * whitelist `permitAll()` — khách chưa đăng nhập vẫn đọc được tin tức.
 * Ghi bình luận thì bắt buộc đăng nhập (`NEWS_COMMENT_CREATE`).
 */
import client from "../client";
import type {
  NewsArticleResponse,
  NewsArticleStatus,
  NewsCategoryResponse,
  NewsCommentResponse,
  NewsStatsResponse,
  PageResponse,
} from "../types";

/** Payload tạo/sửa danh mục bài viết — khớp `NewsCategoryRequest.java`. */
export interface NewsCategoryWriteRequest {
  /** Mã danh mục — bắt buộc, tối đa 30 ký tự. */
  code: string;
  name: string;
  description?: string | null;
}

/** Payload tạo/sửa bài viết — khớp `NewsArticleRequest.java`. */
export interface NewsArticleWriteRequest {
  categoryId: string;
  title: string;
  /** Đường dẫn (slug) — bỏ trống thì backend tự sinh từ tiêu đề. */
  slug?: string | null;
  summary?: string | null;
  content?: string | null;
  thumbnailUrl?: string | null;
  authorName?: string | null;
  status?: NewsArticleStatus;
  featured?: boolean;
}

/** Payload gửi bình luận — khớp `NewsCommentRequest.java`. */
export interface NewsCommentWriteRequest {
  content: string;
  /** Bình luận cha (trả lời) — tuỳ chọn. */
  parentId?: string | null;
}

export interface ListNewsArticlesParams {
  keyword?: string;
  categoryId?: string;
  status?: NewsArticleStatus;
  featured?: boolean;
  page?: number;
  size?: number;
  sortBy?: string;
  sortDirection?: "ASC" | "DESC";
}

export const newsApi = {
  // ── Danh mục bài viết ──────────────────────────────────────────────────────
  listCategories: async (params: { keyword?: string; page?: number; size?: number } = {}) => {
    return client.requestPage<PageResponse<NewsCategoryResponse>>(
      "/api/news-categories",
      { keyword: params.keyword, page: params.page ?? 0, size: params.size ?? 50 },
    );
  },

  /** Toàn bộ danh mục dạng list — dùng cho dropdown bộ lọc. */
  listAllCategories: async (): Promise<NewsCategoryResponse[]> => {
    return client.request<NewsCategoryResponse[]>("/api/news-categories/all");
  },

  getCategory: async (id: string): Promise<NewsCategoryResponse> => {
    return client.request<NewsCategoryResponse>(`/api/news-categories/${id}`);
  },

  /** Tạo danh mục bài viết. Cần authority `NEWS_CATEGORY_WRITE`. */
  createCategory: async (
    data: NewsCategoryWriteRequest,
  ): Promise<NewsCategoryResponse> => {
    return client.request<NewsCategoryResponse>("/api/news-categories", {
      method: "POST",
      body: data,
    });
  },

  /** Cập nhật danh mục bài viết. Cần authority `NEWS_CATEGORY_WRITE`. */
  updateCategory: async (
    id: string,
    data: NewsCategoryWriteRequest,
  ): Promise<NewsCategoryResponse> => {
    return client.request<NewsCategoryResponse>(`/api/news-categories/${id}`, {
      method: "PUT",
      body: data,
    });
  },

  /** Xoá danh mục (không xoá được nếu còn bài viết). Cần `NEWS_CATEGORY_WRITE`. */
  deleteCategory: async (id: string): Promise<void> => {
    await client.request<void>(`/api/news-categories/${id}`, { method: "DELETE" });
  },

  // ── Bài viết (đọc công khai) ───────────────────────────────────────────────
  /** Danh sách bài viết đã đăng — công khai. */
  listPublishedArticles: async (
    params: ListNewsArticlesParams = {},
  ): Promise<PageResponse<NewsArticleResponse>> => {
    return client.requestPage<PageResponse<NewsArticleResponse>>(
      "/api/news-articles",
      {
        keyword: params.keyword,
        categoryId: params.categoryId,
        featured: params.featured,
        page: params.page ?? 0,
        size: params.size ?? 12,
        sortBy: params.sortBy ?? "publishedAt",
        sortDirection: params.sortDirection ?? "DESC",
      },
    );
  },

  /** Bài viết nổi bật — công khai. */
  listFeaturedArticles: async (
    params: { page?: number; size?: number } = {},
  ): Promise<PageResponse<NewsArticleResponse>> => {
    return client.requestPage<PageResponse<NewsArticleResponse>>(
      "/api/news-articles/featured",
      { page: params.page ?? 0, size: params.size ?? 5 },
    );
  },

  /** Chi tiết bài viết theo slug — công khai (mỗi lượt đọc tăng view count). */
  getArticleBySlug: async (slug: string): Promise<NewsArticleResponse> => {
    return client.request<NewsArticleResponse>(`/api/news-articles/${slug}`);
  },

  /** Bài viết liên quan (cùng danh mục) — công khai. */
  listRelatedArticles: async (
    articleId: string,
    params: { page?: number; size?: number } = {},
  ): Promise<PageResponse<NewsArticleResponse>> => {
    return client.requestPage<PageResponse<NewsArticleResponse>>(
      `/api/news-articles/${articleId}/related`,
      { page: params.page ?? 0, size: params.size ?? 5 },
    );
  },

  // ── Bài viết (quản lý) ──────────────────────────────────────────────────────
  /** Danh sách bài viết mọi trạng thái. Cần authority `NEWS_ARTICLE_READ`. */
  listArticles: async (
    params: ListNewsArticlesParams = {},
  ): Promise<PageResponse<NewsArticleResponse>> => {
    return client.requestPage<PageResponse<NewsArticleResponse>>(
      "/api/news-articles/admin",
      {
        keyword: params.keyword,
        categoryId: params.categoryId,
        status: params.status,
        page: params.page ?? 0,
        size: params.size ?? 20,
        sortBy: params.sortBy ?? "updatedAt",
        sortDirection: params.sortDirection ?? "DESC",
      },
    );
  },

  /** Chi tiết bài viết ở mọi trạng thái. Cần authority `NEWS_ARTICLE_READ`. */
  getArticle: async (id: string): Promise<NewsArticleResponse> => {
    return client.request<NewsArticleResponse>(`/api/news-articles/admin/${id}`);
  },

  /** Thống kê tin tức. Cần authority `NEWS_ARTICLE_READ`. */
  getStats: async (): Promise<NewsStatsResponse> => {
    return client.request<NewsStatsResponse>("/api/news-articles/admin/stats");
  },

  /** Tạo bài viết. Cần authority `NEWS_ARTICLE_WRITE`. */
  createArticle: async (
    data: NewsArticleWriteRequest,
  ): Promise<NewsArticleResponse> => {
    return client.request<NewsArticleResponse>("/api/news-articles", {
      method: "POST",
      body: data,
    });
  },

  /** Cập nhật bài viết. Cần authority `NEWS_ARTICLE_WRITE`. */
  updateArticle: async (
    id: string,
    data: NewsArticleWriteRequest,
  ): Promise<NewsArticleResponse> => {
    return client.request<NewsArticleResponse>(`/api/news-articles/${id}`, {
      method: "PUT",
      body: data,
    });
  },

  /** Đăng bài (DRAFT/ARCHIVED → PUBLISHED). Cần `NEWS_ARTICLE_WRITE`. */
  publishArticle: async (id: string): Promise<NewsArticleResponse> => {
    return client.request<NewsArticleResponse>(`/api/news-articles/${id}/publish`, {
      method: "POST",
    });
  },

  /** Chuyển bài về bản nháp (PUBLISHED → DRAFT). Cần `NEWS_ARTICLE_WRITE`. */
  unpublishArticle: async (id: string): Promise<NewsArticleResponse> => {
    return client.request<NewsArticleResponse>(`/api/news-articles/${id}/unpublish`, {
      method: "POST",
    });
  },

  /** Lưu trữ bài viết. Cần `NEWS_ARTICLE_WRITE`. */
  archiveArticle: async (id: string): Promise<NewsArticleResponse> => {
    return client.request<NewsArticleResponse>(`/api/news-articles/${id}/archive`, {
      method: "POST",
    });
  },

  /** Xoá bài viết. Cần `NEWS_ARTICLE_WRITE`. */
  deleteArticle: async (id: string): Promise<void> => {
    await client.request<void>(`/api/news-articles/${id}`, { method: "DELETE" });
  },

  // ── Bình luận ───────────────────────────────────────────────────────────────
  /** Bình luận đang hiển thị của một bài viết — công khai. */
  listComments: async (articleId: string): Promise<NewsCommentResponse[]> => {
    return client.request<NewsCommentResponse[]>(
      `/api/news-comments/articles/${articleId}`,
    );
  },

  /** Tất cả bình luận (kể cả đã ẩn). Cần authority `NEWS_COMMENT_MODERATE`. */
  listAllComments: async (articleId: string): Promise<NewsCommentResponse[]> => {
    return client.request<NewsCommentResponse[]>(
      `/api/news-comments/articles/${articleId}/all`,
    );
  },

  /** Gửi bình luận. Cần authority `NEWS_COMMENT_CREATE` (đã đăng nhập). */
  createComment: async (
    articleId: string,
    data: NewsCommentWriteRequest,
  ): Promise<NewsCommentResponse> => {
    return client.request<NewsCommentResponse>(
      `/api/news-comments/articles/${articleId}`,
      { method: "POST", body: data },
    );
  },

  /** Ẩn / hiện bình luận. Cần authority `NEWS_COMMENT_MODERATE`. */
  setCommentActive: async (
    commentId: string,
    active: boolean,
  ): Promise<NewsCommentResponse> => {
    return client.request<NewsCommentResponse>(
      `/api/news-comments/${commentId}?active=${active}`,
      { method: "PATCH" },
    );
  },

  /** Xoá bình luận (tác giả hoặc người kiểm duyệt). */
  deleteComment: async (commentId: string): Promise<void> => {
    await client.request<void>(`/api/news-comments/${commentId}`, {
      method: "DELETE",
    });
  },
};
