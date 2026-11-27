/**
 * AdminNews — quản lý bài viết tin tức.
 *
 * Nguồn dữ liệu (news-service):
 *  - GET    /api/news-articles/admin          → danh sách bài viết (mọi trạng thái)
 *  - GET    /api/news-articles/admin/{id}     → chi tiết bài viết
 *  - POST   /api/news-articles                → tạo bài viết
 *  - PUT    /api/news-articles/{id}           → sửa bài viết
 *  - POST   /api/news-articles/{id}/publish   → đăng bài
 *  - POST   /api/news-articles/{id}/unpublish → chuyển về nháp
 *  - POST   /api/news-articles/{id}/archive   → lưu trữ
 *  - DELETE /api/news-articles/{id}           → xoá bài viết
 *  - GET    /api/news-comments/articles/{id}  → bình luận của bài viết
 *  - PATCH  /api/news-comments/{id}?active=   → ẩn / hiện bình luận
 *  - DELETE /api/news-comments/{id}           → xoá bình luận
 *
 * Cần authority: NEWS_ARTICLE_READ (xem) / NEWS_ARTICLE_WRITE (ghi) /
 * NEWS_COMMENT_MODERATE (kiểm duyệt bình luận).
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  IconNote,
  IconPlus,
  IconEdit,
  IconTrash,
  IconRefresh,
  IconCheck,
  IconClose,
  IconSearch,
  IconEye,
  IconChat,
  IconUpload,
  IconCheckCircle,
} from "../../components/icons";
import Badge from "../../components/Badge";
import Button from "../../components/Button";
import Card from "../../components/Card";
import Input from "../../components/Input";
import { useToast } from "../../components/Toast";
import { newsApi } from "../../api/endpoints/news";
import { hasTokenAuthority } from "../../api/session";
import type {
  NewsArticleResponse,
  NewsArticleStatus,
  NewsCategoryResponse,
  NewsCommentResponse,
} from "../../api/types";

// =========================
// AdminNews
// =========================

const STATUS_LABEL: Record<NewsArticleStatus, string> = {
  DRAFT: "Bản nháp",
  PUBLISHED: "Đã đăng",
  ARCHIVED: "Đã lưu trữ",
};

const STATUS_TONE: Record<
  NewsArticleStatus,
  "default" | "primary" | "warning"
> = {
  DRAFT: "warning",
  PUBLISHED: "primary",
  ARCHIVED: "default",
};

export default function AdminNews() {
  const t = useToast();

  const [articles, setArticles] = useState<NewsArticleResponse[]>([]);
  const [categories, setCategories] = useState<NewsCategoryResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /** Bộ lọc. */
  const [keyword, setKeyword] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<"" | NewsArticleStatus>("");

  /** Modal soạn bài viết. */
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<NewsArticleResponse | null>(null);
  const [form, setForm] = useState({
    categoryId: "",
    title: "",
    slug: "",
    summary: "",
    content: "",
    thumbnailUrl: "",
    authorName: "",
    status: "DRAFT" as NewsArticleStatus,
    featured: false,
  });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  /** Modal xem / kiểm duyệt bình luận. */
  const [commentsFor, setCommentsFor] = useState<NewsArticleResponse | null>(
    null,
  );
  const [comments, setComments] = useState<NewsCommentResponse[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);

  const canWrite = hasTokenAuthority("NEWS_ARTICLE_WRITE");
  const canModerate = hasTokenAuthority("NEWS_COMMENT_MODERATE");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [artRes, catRes] = await Promise.all([
        newsApi.listArticles({
          keyword: keyword || undefined,
          categoryId: categoryFilter || undefined,
          status: statusFilter || undefined,
          size: 100,
        }),
        newsApi.listAllCategories().catch(() => []),
      ]);
      setArticles(artRes.items ?? []);
      setCategories(catRes ?? []);
    } catch (err) {
      setArticles([]);
      setError(
        err instanceof Error
          ? err.message
          : "Không tải được danh sách bài viết từ máy chủ",
      );
    } finally {
      setLoading(false);
    }
  }, [keyword, categoryFilter, statusFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  const openCreate = useCallback(() => {
    setEditing(null);
    setForm({
      categoryId: categories[0]?.id ?? "",
      title: "",
      slug: "",
      summary: "",
      content: "",
      thumbnailUrl: "",
      authorName: "",
      status: "DRAFT",
      featured: false,
    });
    setFormError(null);
    setEditorOpen(true);
  }, [categories]);

  const openEdit = useCallback((a: NewsArticleResponse) => {
    setEditing(a);
    setForm({
      categoryId: a.categoryId,
      title: a.title,
      slug: a.slug,
      summary: a.summary ?? "",
      content: a.content ?? "",
      thumbnailUrl: a.thumbnailUrl ?? "",
      authorName: a.authorName ?? "",
      status: a.status,
      featured: a.isFeatured,
    });
    setFormError(null);
    setEditorOpen(true);
  }, []);

  const closeEditor = useCallback(() => {
    setEditorOpen(false);
    setEditing(null);
    setFormError(null);
  }, []);

  const handleSave = useCallback(async () => {
    setFormError(null);
    const title = form.title.trim();
    if (!title) {
      setFormError("Tiêu đề bài viết không được để trống.");
      return;
    }
    if (!form.categoryId) {
      setFormError("Vui lòng chọn danh mục bài viết.");
      return;
    }

    const payload = {
      categoryId: form.categoryId,
      title,
      slug: form.slug.trim() || null,
      summary: form.summary.trim() || null,
      content: form.content.trim() || null,
      thumbnailUrl: form.thumbnailUrl.trim() || null,
      authorName: form.authorName.trim() || null,
      status: form.status,
      featured: form.featured,
    };

    setSaving(true);
    try {
      const saved = editing
        ? await newsApi.updateArticle(editing.id, payload)
        : await newsApi.createArticle(payload);
      setArticles((prev) =>
        editing
          ? prev.map((a) => (a.id === saved.id ? saved : a))
          : [saved, ...prev],
      );
      setEditorOpen(false);
      setEditing(null);
      t.success(
        editing ? "Đã cập nhật bài viết" : "Đã tạo bài viết mới",
      );
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : "Không lưu được bài viết",
      );
    } finally {
      setSaving(false);
    }
  }, [form, editing, t]);

  /** Đổi trạng thái bài viết (đăng / nháp / lưu trữ). */
  const changeStatus = useCallback(
    async (a: NewsArticleResponse, action: "publish" | "unpublish" | "archive") => {
      try {
        const saved =
          action === "publish"
            ? await newsApi.publishArticle(a.id)
            : action === "unpublish"
              ? await newsApi.unpublishArticle(a.id)
              : await newsApi.archiveArticle(a.id);
        setArticles((prev) => prev.map((x) => (x.id === saved.id ? saved : x)));
        t.success(
          action === "publish"
            ? "Đã đăng bài viết"
            : action === "unpublish"
              ? "Đã chuyển về bản nháp"
              : "Đã lưu trữ bài viết",
        );
      } catch (err) {
        t.error(
          err instanceof Error ? err.message : "Không thay đổi được trạng thái bài viết",
        );
      }
    },
    [t],
  );

  const handleDelete = useCallback(
    async (a: NewsArticleResponse) => {
      try {
        await newsApi.deleteArticle(a.id);
        setArticles((prev) => prev.filter((x) => x.id !== a.id));
        t.success(`Đã xoá bài viết "${a.title}"`);
      } catch (err) {
        t.error(
          err instanceof Error
            ? err.message
            : `Không xoá được bài viết "${a.title}"`,
        );
      }
    },
    [t],
  );

  // ── Bình luận ─────────────────────────────────────────────────────────────

  const openComments = useCallback(
    async (a: NewsArticleResponse) => {
      setCommentsFor(a);
      setCommentsLoading(true);
      try {
        const list = canModerate
          ? await newsApi.listAllComments(a.id)
          : await newsApi.listComments(a.id);
        setComments(list ?? []);
      } catch (err) {
        setComments([]);
        t.error(
          err instanceof Error ? err.message : "Không tải được bình luận",
        );
      } finally {
        setCommentsLoading(false);
      }
    },
    [canModerate, t],
  );

  const toggleComment = useCallback(
    async (c: NewsCommentResponse) => {
      try {
        const saved = await newsApi.setCommentActive(c.id, !c.isActive);
        setComments((prev) =>
          prev.map((x) => (x.id === saved.id ? saved : x)),
        );
        t.success(saved.isActive ? "Đã hiển thị bình luận" : "Đã ẩn bình luận");
      } catch (err) {
        t.error(
          err instanceof Error ? err.message : "Không cập nhật được bình luận",
        );
      }
    },
    [t],
  );

  const deleteComment = useCallback(
    async (c: NewsCommentResponse) => {
      try {
        await newsApi.deleteComment(c.id);
        setComments((prev) => prev.filter((x) => x.id !== c.id));
        t.success("Đã xoá bình luận");
      } catch (err) {
        t.error(
          err instanceof Error ? err.message : "Không xoá được bình luận",
        );
      }
    },
    [t],
  );

  const stats = useMemo(
    () => ({
      total: articles.length,
      published: articles.filter((a) => a.status === "PUBLISHED").length,
      draft: articles.filter((a) => a.status === "DRAFT").length,
      archived: articles.filter((a) => a.status === "ARCHIVED").length,
    }),
    [articles],
  );

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 flex items-center justify-between gap-3">
          <span>{error}</span>
          <Button variant="outline" size="sm" onClick={() => void load()}>
            <IconRefresh size={14} />
            Thử lại
          </Button>
        </div>
      )}

      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
            <span className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <IconNote size={20} />
            </span>
            Quản lý bài viết
          </h1>
          <p className="text-sm text-ink-muted mt-1">
            {loading
              ? "Đang tải..."
              : `${stats.total} bài viết · ${stats.published} đang hiển thị · ${stats.draft} bản nháp · ${stats.archived} lưu trữ`}
          </p>
        </div>
        {canWrite && (
          <Button onClick={openCreate}>
            <IconPlus size={16} />
            Soạn bài viết
          </Button>
        )}
      </div>

      {/* Bộ lọc */}
      <Card hover={false}>
        <div className="p-3 flex items-center gap-2 flex-wrap">
          <div className="flex-1 min-w-[220px]">
            <Input
              placeholder="Tìm bài viết theo tiêu đề..."
              leftIcon={<IconSearch size={16} />}
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
            />
          </div>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="h-11 px-3 rounded-xl border border-ink/15 bg-white text-sm"
            aria-label="Lọc theo danh mục"
          >
            <option value="">Tất cả danh mục</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(e.target.value as "" | NewsArticleStatus)
            }
            className="h-11 px-3 rounded-xl border border-ink/15 bg-white text-sm"
            aria-label="Lọc theo trạng thái"
          >
            <option value="">Tất cả trạng thái</option>
            <option value="PUBLISHED">Đã đăng</option>
            <option value="DRAFT">Bản nháp</option>
            <option value="ARCHIVED">Đã lưu trữ</option>
          </select>
          <Button variant="outline" size="sm" onClick={() => void load()}>
            <IconRefresh size={14} />
            Tải lại
          </Button>
        </div>
      </Card>

      {/* Danh sách bài viết */}
      <Card hover={false}>
        {articles.length === 0 ? (
          <div className="p-10 text-center text-sm text-ink-muted">
            {loading ? "Đang tải..." : "Chưa có bài viết nào."}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-ink-muted uppercase border-b border-ink/8">
                  <th className="font-medium px-4 py-3">Bài viết</th>
                  <th className="font-medium px-4 py-3">Danh mục</th>
                  <th className="font-medium px-4 py-3">Trạng thái</th>
                  <th className="font-medium px-4 py-3">Tác giả</th>
                  <th className="font-medium px-4 py-3">Lượt đọc</th>
                  <th className="font-medium px-4 py-3">Ngày đăng</th>
                  <th className="font-medium px-4 py-3 text-right">Hành động</th>
                </tr>
              </thead>
              <tbody>
                {articles.map((a) => (
                  <tr
                    key={a.id}
                    className="border-b border-ink/5 hover:bg-bgsoft/40 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-lg overflow-hidden bg-bgsoft shrink-0">
                          {a.thumbnailUrl && (
                            <img
                              src={a.thumbnailUrl}
                              alt={a.title}
                              className="w-full h-full object-cover"
                            />
                          )}
                        </div>
                        <div className="min-w-0">
                          <Link
                            to={`/news/${a.slug}`}
                            className="font-semibold text-sm hover:text-primary line-clamp-1"
                            title={a.title}
                          >
                            {a.title}
                          </Link>
                          <div className="text-xs text-ink-muted line-clamp-1">
                            /{a.slug}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone="default">{a.categoryName}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col items-start gap-1">
                        <Badge tone={STATUS_TONE[a.status]}>
                          {STATUS_LABEL[a.status]}
                        </Badge>
                        {a.isFeatured && (
                          <Badge tone="accent">Nổi bật</Badge>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-ink-muted">
                      {a.authorName || "—"}
                    </td>
                    <td className="px-4 py-3 text-xs text-ink-muted">
                      <span className="inline-flex items-center gap-1">
                        <IconEye size={12} />
                        {a.viewCount}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-ink-muted whitespace-nowrap">
                      {a.publishedAt
                        ? new Date(a.publishedAt).toLocaleDateString("vi-VN")
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex items-center gap-1">
                        <button
                          onClick={() => void openComments(a)}
                          className="p-1.5 rounded-md hover:bg-bgsoft text-ink-muted hover:text-primary"
                          title="Xem bình luận"
                        >
                          <IconChat size={15} />
                        </button>
                        {canWrite && a.status !== "PUBLISHED" && (
                          <button
                            onClick={() => void changeStatus(a, "publish")}
                            className="p-1.5 rounded-md hover:bg-bgsoft text-ink-muted hover:text-primary"
                            title="Đăng bài"
                          >
                            <IconCheckCircle size={15} />
                          </button>
                        )}
                        {canWrite && a.status === "PUBLISHED" && (
                          <button
                            onClick={() => void changeStatus(a, "unpublish")}
                            className="p-1.5 rounded-md hover:bg-bgsoft text-ink-muted hover:text-primary"
                            title="Chuyển về bản nháp"
                          >
                            <IconClose size={15} />
                          </button>
                        )}
                        {canWrite && a.status !== "ARCHIVED" && (
                          <button
                            onClick={() => void changeStatus(a, "archive")}
                            className="p-1.5 rounded-md hover:bg-bgsoft text-ink-muted hover:text-primary"
                            title="Lưu trữ"
                          >
                            <IconUpload size={15} />
                          </button>
                        )}
                        {canWrite && (
                          <button
                            onClick={() => openEdit(a)}
                            className="p-1.5 rounded-md hover:bg-bgsoft text-ink-muted hover:text-primary"
                            title="Sửa"
                          >
                            <IconEdit size={15} />
                          </button>
                        )}
                        {canWrite && (
                          <button
                            onClick={() => void handleDelete(a)}
                            className="p-1.5 rounded-md hover:bg-red-50 text-ink-muted hover:text-red-500"
                            title="Xoá"
                          >
                            <IconTrash size={15} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* ── Modal soạn / sửa bài viết ─────────────────────────────────────── */}
      {editorOpen && (
        <div
          className="fixed inset-0 z-50 bg-ink/50 flex items-center justify-center p-4 overflow-y-auto"
          onClick={closeEditor}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl w-full max-w-3xl my-8"
          >
            <div className="flex items-center justify-between p-5 border-b border-ink/8">
              <h3 className="font-bold text-base">
                {editing ? "Sửa bài viết" : "Soạn bài viết mới"}
              </h3>
              <button
                type="button"
                onClick={closeEditor}
                className="p-1.5 rounded-md hover:bg-bgsoft text-ink-muted"
              >
                <IconClose size={18} />
              </button>
            </div>

            <div className="p-5 space-y-3">
              {formError && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {formError}
                </div>
              )}

              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-ink mb-1.5 block">
                    Danh mục <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={form.categoryId}
                    onChange={(e) =>
                      setForm({ ...form, categoryId: e.target.value })
                    }
                    className="w-full h-11 px-3 rounded-xl border border-ink/15 bg-white text-sm focus:border-primary focus:outline-none"
                  >
                    <option value="">-- Chọn --</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-ink mb-1.5 block">
                    Trạng thái
                  </label>
                  <select
                    value={form.status}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        status: e.target.value as NewsArticleStatus,
                      })
                    }
                    className="w-full h-11 px-3 rounded-xl border border-ink/15 bg-white text-sm focus:border-primary focus:outline-none"
                  >
                    <option value="DRAFT">Bản nháp</option>
                    <option value="PUBLISHED">Đăng ngay</option>
                    <option value="ARCHIVED">Lưu trữ</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-ink mb-1.5 block">
                  Tiêu đề <span className="text-red-500">*</span>
                </label>
                <Input
                  value={form.title}
                  onChange={(e) =>
                    setForm({ ...form, title: e.target.value })
                  }
                  placeholder="VD: GS Ngô Bảo Châu khởi xướng mạng lưới nghiên cứu toán châu Á"
                />
              </div>

              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-ink mb-1.5 block">
                    Đường dẫn (slug)
                  </label>
                  <Input
                    value={form.slug}
                    onChange={(e) =>
                      setForm({ ...form, slug: e.target.value })
                    }
                    placeholder="Bỏ trống để hệ thống tự sinh từ tiêu đề"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-ink mb-1.5 block">
                    Tác giả
                  </label>
                  <Input
                    value={form.authorName}
                    onChange={(e) =>
                      setForm({ ...form, authorName: e.target.value })
                    }
                    placeholder="Bỏ trống để lấy tài khoản đang đăng nhập"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-ink mb-1.5 block">
                  Ảnh đại diện (URL)
                </label>
                <Input
                  value={form.thumbnailUrl}
                  onChange={(e) =>
                    setForm({ ...form, thumbnailUrl: e.target.value })
                  }
                  placeholder="https://..."
                />
              </div>

              <div>
                <label className="text-sm font-medium text-ink mb-1.5 block">
                  Tóm tắt
                </label>
                <textarea
                  value={form.summary}
                  onChange={(e) =>
                    setForm({ ...form, summary: e.target.value })
                  }
                  rows={2}
                  placeholder="Đoạn dẫn (lead) hiển thị dưới tiêu đề"
                  className="w-full px-3 py-2 rounded-xl border border-ink/15 bg-white text-sm focus:border-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-ink mb-1.5 block">
                  Nội dung bài viết
                </label>
                <textarea
                  value={form.content}
                  onChange={(e) =>
                    setForm({ ...form, content: e.target.value })
                  }
                  rows={10}
                  placeholder="Nội dung bài viết (hỗ trợ HTML: <p>, <h2>, <ul>, <strong>...)"
                  className="w-full px-3 py-2 rounded-xl border border-ink/15 bg-white text-sm font-mono focus:border-primary focus:outline-none"
                />
                <span className="text-xs text-ink-muted">
                  Nội dung được hiển thị trực tiếp trên trang đọc bài — hỗ trợ
                  thẻ HTML cơ bản.
                </span>
              </div>

              <label className="flex items-center gap-2 text-sm text-ink cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.featured}
                  onChange={(e) =>
                    setForm({ ...form, featured: e.target.checked })
                  }
                  className="w-4 h-4 accent-primary"
                />
                Bài nổi bật (hiển thị ở đầu trang tin tức)
              </label>
            </div>

            <div className="p-5 border-t border-ink/8 flex gap-2 justify-end">
              <Button variant="outline" onClick={closeEditor} disabled={saving}>
                Huỷ
              </Button>
              <Button onClick={() => void handleSave()} disabled={saving}>
                <IconCheck size={14} />
                {saving
                  ? "Đang lưu..."
                  : editing
                    ? "Cập nhật"
                    : "Lưu bài viết"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal bình luận ───────────────────────────────────────────────── */}
      {commentsFor && (
        <div
          className="fixed inset-0 z-50 bg-ink/50 flex items-center justify-center p-4"
          onClick={() => setCommentsFor(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col"
          >
            <div className="flex items-center justify-between p-5 border-b border-ink/8">
              <div>
                <h3 className="font-bold text-base">Bình luận</h3>
                <p className="text-xs text-ink-muted line-clamp-1">
                  {commentsFor.title}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCommentsFor(null)}
                className="p-1.5 rounded-md hover:bg-bgsoft text-ink-muted"
              >
                <IconClose size={18} />
              </button>
            </div>

            <div className="p-5 overflow-y-auto flex-1 space-y-4">
              {commentsLoading ? (
                <p className="text-sm text-ink-muted text-center py-6">
                  Đang tải bình luận...
                </p>
              ) : comments.length === 0 ? (
                <p className="text-sm text-ink-muted text-center py-6">
                  Bài viết này chưa có bình luận nào.
                </p>
              ) : (
                comments.map((c) => (
                  <div
                    key={c.id}
                    className="border-b border-ink/5 pb-3 last:border-0 last:pb-0"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-semibold">
                            {c.userName ?? "Người dùng"}
                          </span>
                          <span className="text-xs text-ink-muted">
                            {new Date(c.createdAt).toLocaleString("vi-VN")}
                          </span>
                          {!c.isActive && (
                            <Badge tone="warning">Đã ẩn</Badge>
                          )}
                        </div>
                        <p className="text-sm text-ink-light mt-1 whitespace-pre-wrap">
                          {c.content}
                        </p>
                      </div>
                      {canModerate && (
                        <div className="inline-flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => void toggleComment(c)}
                            className="p-1.5 rounded-md hover:bg-bgsoft text-ink-muted hover:text-primary"
                            title={c.isActive ? "Ẩn bình luận" : "Hiện bình luận"}
                          >
                            <IconEye size={15} />
                          </button>
                          <button
                            onClick={() => void deleteComment(c)}
                            className="p-1.5 rounded-md hover:bg-red-50 text-ink-muted hover:text-red-500"
                            title="Xoá bình luận"
                          >
                            <IconTrash size={15} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
