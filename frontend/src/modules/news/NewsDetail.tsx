/**
 * NewsDetail — trang đọc bài viết tin tức (public) + khu vực bình luận.
 *
 * Nguồn dữ liệu (news-service):
 *  - GET /api/news-articles/{slug}              → nội dung bài viết
 *  - GET /api/news-articles/{id}/related        → bài liên quan
 *  - GET /api/news-comments/articles/{id}       → bình luận
 *  - POST /api/news-comments/articles/{id}      → gửi bình luận (cần đăng nhập)
 *
 * Bình luận yêu cầu authority `NEWS_COMMENT_CREATE` — nếu chưa đăng nhập,
 * hiển thị lời nhắc đăng nhập thay vì form.
 */
import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  IconArrowLeft,
  IconClock,
  IconEye,
  IconUser,
  IconChat,
  IconSend,
  IconNote,
  IconRefresh,
  IconHeart,
  IconSort,
} from "../../components/icons";
import Card from "../../components/Card";
import Badge from "../../components/Badge";
import Button from "../../components/Button";
import { Spinner } from "../../components/Loading";
import { newsApi } from "../../api/endpoints/news";
import { resolveMediaUrl } from "../../api/media";
import { hasTokenAuthority, hasSession } from "../../api/session";
import { useAuth } from "../../data/authStore";
import { useToast } from "../../components/Toast";
import type {
  NewsArticleResponse,
  NewsCommentResponse,
} from "../../api/types";
import type { NewsCommentSort } from "../../api/endpoints/news";
import { formatNewsDate } from "./NewsList";

/** Các lựa chọn sắp xếp bình luận. */
const COMMENT_SORT_OPTIONS: { value: NewsCommentSort; label: string }[] = [
  { value: "oldest", label: "Cũ nhất" },
  { value: "newest", label: "Mới nhất" },
  { value: "mostLiked", label: "Nhiều lượt thích" },
];

export default function NewsDetail() {
  const { slug = "" } = useParams();
  const t = useToast();
  const { user } = useAuth();

  const [article, setArticle] = useState<NewsArticleResponse | null>(null);
  const [related, setRelated] = useState<NewsArticleResponse[]>([]);
  const [comments, setComments] = useState<NewsCommentResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [commentText, setCommentText] = useState("");
  const [replyTo, setReplyTo] = useState<NewsCommentResponse | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [commentSort, setCommentSort] = useState<NewsCommentSort>("oldest");
  const [likingIds, setLikingIds] = useState<Set<string>>(new Set());

  const canComment = hasTokenAuthority("NEWS_COMMENT_CREATE");

  const load = useCallback(async () => {
    if (!slug) return;
    setLoading(true);
    setError(null);
    try {
      const data = await newsApi.getArticleBySlug(slug);
      setArticle(data);
      const [rel, cmt] = await Promise.all([
        newsApi
          .listRelatedArticles(data.id, { size: 4 })
          .then((r) => r.items ?? [])
          .catch(() => []),
        newsApi.listComments(data.id).catch(() => []),
      ]);
      setRelated(rel);
      setComments(cmt);
    } catch (err) {
      setArticle(null);
      setError(
        err instanceof Error
          ? err.message
          : "Không tải được bài viết từ máy chủ",
      );
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    void load();
  }, [load]);

  /** Tải lại danh sách bình luận theo thứ tự đang chọn. */
  const loadComments = useCallback(async () => {
    if (!article) return;
    try {
      const list = await newsApi.listComments(article.id, commentSort);
      setComments(list ?? []);
    } catch {
      // Giữ nguyên danh sách cũ nếu tải lại thất bại.
    }
  }, [article, commentSort]);

  useEffect(() => {
    void loadComments();
  }, [loadComments]);

  /** Đổi thứ tự sắp xếp bình luận. */
  const changeSort = useCallback(
    (next: NewsCommentSort) => {
      setCommentSort(next);
    },
    [],
  );

  /** Thích / bỏ thích bình luận. */
  const toggleLike = useCallback(
    async (comment: NewsCommentResponse) => {
      if (!hasSession()) {
        t.error("Đăng nhập để thích bình luận");
        return;
      }
      setLikingIds((prev) => new Set(prev).add(comment.id));
      try {
        const saved = await newsApi.toggleCommentLike(comment.id);
        setComments((prev) =>
          prev.map((c) => (c.id === saved.id ? saved : c)),
        );
      } catch (err) {
        t.error(
          err instanceof Error ? err.message : "Không thích được bình luận",
        );
      } finally {
        setLikingIds((prev) => {
          const next = new Set(prev);
          next.delete(comment.id);
          return next;
        });
      }
    },
    [t],
  );

  const handleSubmit = useCallback(async () => {
    if (!article) return;
    const content = commentText.trim();
    if (!content) {
      t.error("Vui lòng nhập nội dung bình luận");
      return;
    }

    setSubmitting(true);
    try {
      const saved = await newsApi.createComment(article.id, {
        content,
        parentId: replyTo?.id ?? null,
      });
      setComments((prev) => [...prev, saved]);
      setCommentText("");
      setReplyTo(null);
      t.success("Đã gửi bình luận");
    } catch (err) {
      t.error(
        err instanceof Error ? err.message : "Không gửi được bình luận",
      );
    } finally {
      setSubmitting(false);
    }
  }, [article, commentText, replyTo, t]);

  if (loading) {
    return (
      <div className="container-page py-10 flex justify-center">
        <Spinner size="lg" label="Đang tải bài viết..." />
      </div>
    );
  }

  if (error || !article) {
    return (
      <div className="container-page py-10">
        <Card hover={false}>
          <div className="p-10 text-center">
            <IconNote size={40} className="mx-auto mb-3 text-ink-muted" />
            <h1 className="text-xl font-bold mb-2">
              Không tìm thấy bài viết
            </h1>
            <p className="text-sm text-ink-muted mb-6">
              {error ?? "Bài viết có thể đã bị gỡ bỏ hoặc chưa được đăng."}
            </p>
            <div className="flex items-center justify-center gap-2">
              <Button variant="outline" onClick={() => void load()}>
                <IconRefresh size={14} />
                Thử lại
              </Button>
              <Link to="/news">
                <Button>Về trang tin tức</Button>
              </Link>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="container-page py-6 md:py-8">
      {/* Breadcrumb */}
      <nav className="text-xs text-ink-muted mb-4 flex items-center gap-2">
        <Link to="/" className="hover:text-primary">
          Trang chủ
        </Link>
        <span>/</span>
        <Link to="/news" className="hover:text-primary">
          Tin tức
        </Link>
        <span>/</span>
        <span className="text-ink truncate">{article.title}</span>
      </nav>

      <div className="grid lg:grid-cols-[1fr_320px] gap-6">
        {/* Nội dung chính */}
        <article>
          <Card hover={false}>
            <div className="p-5 md:p-8">
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <Badge tone="primary">{article.categoryName}</Badge>
                {article.isFeatured && <Badge tone="accent">Nổi bật</Badge>}
              </div>

              <h1 className="text-2xl md:text-3xl font-bold leading-tight mb-3">
                {article.title}
              </h1>

              {article.summary && (
                <p className="text-base text-ink-light leading-relaxed mb-4">
                  {article.summary}
                </p>
              )}

              <div className="flex flex-wrap items-center gap-4 text-xs text-ink-muted pb-4 mb-5 border-b border-ink/8">
                {article.authorName && (
                  <span className="flex items-center gap-1.5">
                    <IconUser size={13} />
                    {article.authorName}
                  </span>
                )}
                <span className="flex items-center gap-1.5">
                  <IconClock size={13} />
                  {formatNewsDate(article.publishedAt)}
                </span>
                <span className="flex items-center gap-1.5">
                  <IconEye size={13} />
                  {article.viewCount} lượt đọc
                </span>
              </div>

              {article.thumbnailUrl && (
                <figure className="mb-6">
                  <img
                    src={resolveMediaUrl(article.thumbnailUrl)}
                    alt={article.title}
                    className="w-full rounded-2xl object-cover"
                  />
                </figure>
              )}

              {/* Nội dung do quản lý soạn (HTML) — render trực tiếp. */}
              <div
                className="news-content text-[15px] leading-[1.75] text-ink"
                dangerouslySetInnerHTML={{
                  __html: article.content ?? "",
                }}
              />
            </div>
          </Card>

          {/* Bình luận */}
          <Card hover={false} className="mt-5">
            <div className="p-5 md:p-6">
              <h2 className="font-bold text-lg flex items-center gap-2 mb-4">
                <IconChat size={18} className="text-primary" />
                Bình luận
                <span className="text-sm font-normal text-ink-muted">
                  ({comments.length})
                </span>
              </h2>

              {/* Thanh sắp xếp bình luận */}
              {comments.length > 0 && (
                <div className="flex items-center justify-end gap-2 mb-3">
                  <IconSort size={14} className="text-ink-muted" />
                  <span className="text-xs text-ink-muted">Sắp xếp:</span>
                  <div className="inline-flex items-center gap-1 rounded-lg bg-bgsoft p-0.5">
                    {COMMENT_SORT_OPTIONS.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => changeSort(option.value)}
                        className={[
                          "px-2.5 py-1 rounded-md text-xs font-medium transition-colors",
                          commentSort === option.value
                            ? "bg-white text-primary shadow-sm"
                            : "text-ink-muted hover:text-ink",
                        ].join(" ")}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Form gửi bình luận */}
              {canComment ? (
                <div className="mb-6">
                  {replyTo && (
                    <div className="flex items-center justify-between gap-2 mb-2 px-3 py-2 rounded-lg bg-bgsoft text-xs text-ink-muted">
                      <span>
                        Đang trả lời <strong>{replyTo.userName}</strong>
                      </span>
                      <button
                        onClick={() => setReplyTo(null)}
                        className="hover:text-ink"
                      >
                        Huỷ
                      </button>
                    </div>
                  )}
                  <textarea
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    rows={3}
                    placeholder="Chia sẻ ý kiến của bạn về bài viết..."
                    className="w-full px-3 py-2 rounded-xl border border-ink/15 bg-white text-sm focus:border-primary focus:outline-none"
                  />
                  <div className="flex items-center justify-between gap-2 mt-2">
                    <span className="text-xs text-ink-muted">
                      Đăng nhập với tư cách {user?.name ?? "người dùng"}
                    </span>
                    <Button size="sm" onClick={() => void handleSubmit()} disabled={submitting}>
                      <IconSend size={14} />
                      {submitting ? "Đang gửi..." : "Gửi bình luận"}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="mb-6 rounded-xl border border-ink/10 bg-bgsoft px-4 py-3 text-sm text-ink-muted flex items-center justify-between gap-3">
                  <span>
                    {hasSession()
                      ? "Tài khoản của bạn chưa có quyền bình luận."
                      : "Đăng nhập để tham gia bình luận bài viết."}
                  </span>
                  {!hasSession() && (
                    <Link to="/login">
                      <Button size="sm" variant="outline">
                        Đăng nhập
                      </Button>
                    </Link>
                  )}
                </div>
              )}

              {/* Danh sách bình luận */}
              {comments.length === 0 ? (
                <p className="text-sm text-ink-muted text-center py-6">
                  Chưa có bình luận nào. Hãy là người đầu tiên bình luận!
                </p>
              ) : (
                <ul className="space-y-4">
                  {comments.map((c) => (
                    <CommentItem
                      key={c.id}
                      comment={c}
                      canReply={canComment}
                      liking={likingIds.has(c.id)}
                      onReply={() => setReplyTo(c)}
                      onToggleLike={() => void toggleLike(c)}
                    />
                  ))}
                </ul>
              )}
            </div>
          </Card>
        </article>

        {/* Cột phụ */}
        <aside className="space-y-5">
          {related.length > 0 && (
            <Card hover={false}>
              <div className="p-4">
                <h3 className="font-semibold text-sm mb-3">Bài liên quan</h3>
                <ul className="space-y-3">
                  {related.map((r) => (
                    <li key={r.id}>
                      <Link to={`/news/${r.slug}`} className="group block">
                        <div className="aspect-[16/9] rounded-xl overflow-hidden bg-bgsoft mb-1.5">
                          {r.thumbnailUrl && (
                            <img
                              src={resolveMediaUrl(r.thumbnailUrl)}
                              alt={r.title}
                              className="w-full h-full object-cover"
                            />
                          )}
                        </div>
                        <div className="text-xs font-medium leading-snug group-hover:text-primary line-clamp-3">
                          {r.title}
                        </div>
                        <div className="text-[11px] text-ink-muted mt-0.5">
                          {formatNewsDate(r.publishedAt)}
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </Card>
          )}

          <Card hover={false}>
            <div className="p-4">
              <Link
                to="/news"
                className="flex items-center gap-2 text-sm font-medium text-primary hover:underline"
              >
                <IconArrowLeft size={15} />
                Về trang tin tức
              </Link>
            </div>
          </Card>
        </aside>
      </div>
    </div>
  );
}

/** Một bình luận (kèm nút trả lời và nút thích). */
function CommentItem({
  comment,
  canReply,
  liking,
  onReply,
  onToggleLike,
}: {
  comment: NewsCommentResponse;
  canReply: boolean;
  liking: boolean;
  onReply: () => void;
  onToggleLike: () => void;
}) {
  const isReply = comment.parentId != null;
  return (
    <li
      className={[
        "border-b border-ink/5 pb-4 last:border-0 last:pb-0",
        isReply ? "ml-6 md:ml-10" : "",
      ].join(" ")}
    >
      <div className="flex items-start gap-3">
        <span className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
          <IconUser size={15} />
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold">
              {comment.userName ?? "Người dùng"}
            </span>
            <span className="text-xs text-ink-muted">
              {formatNewsDate(comment.createdAt)}
            </span>
          </div>
          <p className="text-sm text-ink-light mt-1 whitespace-pre-wrap">
            {comment.content}
          </p>
          <div className="flex items-center gap-3 mt-2">
            <button
              type="button"
              onClick={onToggleLike}
              disabled={liking}
              title={
                comment.likedByMe
                  ? "Bỏ thích bình luận"
                  : "Thích bình luận này"
              }
              className={[
                "inline-flex items-center gap-1 text-xs transition-colors",
                "disabled:opacity-60",
                comment.likedByMe
                  ? "text-red-500 hover:text-red-600"
                  : "text-ink-muted hover:text-red-500",
              ].join(" ")}
            >
              <IconHeart size={14} filled={comment.likedByMe} />
              {comment.likeCount > 0 && <span>{comment.likeCount}</span>}
            </button>
            {canReply && (
              <button
                type="button"
                onClick={onReply}
                className="text-xs text-primary hover:underline"
              >
                Trả lời
              </button>
            )}
          </div>
        </div>
      </div>
    </li>
  );
}
