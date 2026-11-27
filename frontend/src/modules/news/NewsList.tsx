/**
 * NewsList — trang danh sách tin tức (public).
 *
 * Nguồn dữ liệu (news-service):
 *  - GET /api/news-articles             → bài viết đã đăng (công khai)
 *  - GET /api/news-articles/featured    → bài nổi bật (hero)
 *  - GET /api/news-categories/all       → danh mục (bộ lọc)
 *
 * Không cần đăng nhập — gateway whitelist GET cho các path `/api/news-*`.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  IconSearch,
  IconEye,
  IconClock,
  IconNote,
  IconChevronRight,
  IconArrowLeft,
} from "../../components/icons";
import Card from "../../components/Card";
import Badge from "../../components/Badge";
import Button from "../../components/Button";
import Input from "../../components/Input";
import { SkeletonGrid } from "../../components/Loading";
import { newsApi } from "../../api/endpoints/news";
import type {
  NewsArticleResponse,
  NewsCategoryResponse,
} from "../../api/types";

const PAGE_SIZE = 9;

/** Định dạng ngày theo kiểu báo điện tử: 12:08, 26/11/2026. */
export function formatNewsDate(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const mm2 = String(d.getMonth() + 1).padStart(2, "0");
  return `${hh}:${mm}, ${dd}/${mm2}/${d.getFullYear()}`;
}

export default function NewsList() {
  const [params, setParams] = useSearchParams();
  const categoryId = params.get("category") ?? "";
  const keyword = params.get("q") ?? "";
  const page = Math.max(0, Number(params.get("page") ?? 0));

  const [categories, setCategories] = useState<NewsCategoryResponse[]>([]);
  const [featured, setFeatured] = useState<NewsArticleResponse[]>([]);
  const [articles, setArticles] = useState<NewsArticleResponse[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /** Từ khoá tìm kiếm — cập nhật vào URL để giữ trạng thái khi F5. */
  const [queryInput, setQueryInput] = useState(keyword);

  useEffect(() => {
    setQueryInput(keyword);
  }, [keyword]);

  // Danh mục + bài nổi bật — tải một lần khi vào trang.
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const [cats, feat] = await Promise.all([
          newsApi.listAllCategories(),
          newsApi.listFeaturedArticles({ size: 3 }),
        ]);
        if (cancelled) return;
        setCategories(cats ?? []);
        setFeatured(feat?.items ?? []);
      } catch {
        // Không chặn trang: bộ lọc và hero sẽ để trống.
        if (!cancelled) {
          setCategories([]);
          setFeatured([]);
        }
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const loadArticles = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await newsApi.listPublishedArticles({
        keyword: keyword || undefined,
        categoryId: categoryId || undefined,
        page,
        size: PAGE_SIZE,
      });
      setArticles(res.items ?? []);
      setTotal(res.totalElements ?? 0);
      setTotalPages(res.totalPages ?? 0);
    } catch (err) {
      setArticles([]);
      setError(
        err instanceof Error
          ? err.message
          : "Không tải được danh sách tin tức từ máy chủ",
      );
    } finally {
      setLoading(false);
    }
  }, [keyword, categoryId, page]);

  useEffect(() => {
    void loadArticles();
  }, [loadArticles]);

  /** Cập nhật tham số URL (giữ nguyên các tham số khác). */
  const updateParams = useCallback(
    (patch: Record<string, string | number | null>) => {
      const next = new URLSearchParams(params);
      for (const [key, value] of Object.entries(patch)) {
        if (value === null || value === "") next.delete(key);
        else next.set(key, String(value));
      }
      setParams(next, { replace: true });
    },
    [params, setParams],
  );

  const activeCategory = useMemo(
    () => categories.find((c) => c.id === categoryId) ?? null,
    [categories, categoryId],
  );

  const handleSearch = (value: string) => {
    setQueryInput(value);
    updateParams({ q: value || null, page: 0 });
  };

  const hero = featured[0] ?? null;

  return (
    <div className="container-page py-6 md:py-8">
      {/* Breadcrumb */}
      <nav className="text-xs text-ink-muted mb-4 flex items-center gap-2">
        <Link to="/" className="hover:text-primary">
          Trang chủ
        </Link>
        <span>/</span>
        <span className="text-ink">Tin tức</span>
      </nav>

      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold mb-2">Tin tức</h1>
        <p className="text-ink-light">
          Cập nhật tin tức ô tô, hướng dẫn bảo dưỡng và khuyến mãi tại
          AutoCare.
        </p>
      </div>

      {/* Hero — bài nổi bật */}
      {hero && (
        <Card hover={false} className="mb-6 overflow-hidden">
          <Link to={`/news/${hero.slug}`} className="grid md:grid-cols-2">
            <div className="aspect-[16/9] md:aspect-auto bg-bgsoft overflow-hidden">
              {hero.thumbnailUrl ? (
                <img
                  src={hero.thumbnailUrl}
                  alt={hero.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-ink-muted">
                  <IconNote size={40} />
                </div>
              )}
            </div>
            <div className="p-6 md:p-8 flex flex-col justify-center">
              <div className="flex items-center gap-2 mb-3">
                <Badge tone="primary">Nổi bật</Badge>
                <Badge tone="accent">{hero.categoryName}</Badge>
              </div>
              <h2 className="text-xl md:text-2xl font-bold leading-snug mb-3">
                {hero.title}
              </h2>
              {hero.summary && (
                <p className="text-sm text-ink-light line-clamp-3 mb-4">
                  {hero.summary}
                </p>
              )}
              <div className="flex items-center gap-4 text-xs text-ink-muted">
                <span className="flex items-center gap-1">
                  <IconClock size={13} />
                  {formatNewsDate(hero.publishedAt)}
                </span>
                <span className="flex items-center gap-1">
                  <IconEye size={13} />
                  {hero.viewCount} lượt đọc
                </span>
              </div>
            </div>
          </Link>
        </Card>
      )}

      <div className="grid lg:grid-cols-[260px_1fr] gap-6">
        {/* Bộ lọc danh mục */}
        <aside className="space-y-4">
          <Card hover={false}>
            <div className="p-4">
              <h3 className="font-semibold text-sm mb-3">Danh mục</h3>
              <div className="space-y-1">
                <button
                  onClick={() => updateParams({ category: null, page: 0 })}
                  className={[
                    "w-full text-left text-sm py-1.5 px-2 rounded-lg transition-colors",
                    !categoryId
                      ? "bg-bgsoft text-primary font-medium"
                      : "text-ink hover:bg-bgsoft",
                  ].join(" ")}
                >
                  Tất cả
                </button>
                {categories.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => updateParams({ category: c.id, page: 0 })}
                    className={[
                      "w-full text-left text-sm py-1.5 px-2 rounded-lg transition-colors",
                      categoryId === c.id
                        ? "bg-bgsoft text-primary font-medium"
                        : "text-ink hover:bg-bgsoft",
                    ].join(" ")}
                  >
                    {c.name}
                  </button>
                ))}
              </div>
            </div>
          </Card>
        </aside>

        {/* Danh sách bài viết */}
        <div>
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <div className="flex-1">
              <Input
                placeholder="Tìm bài viết tin tức..."
                leftIcon={<IconSearch size={18} />}
                value={queryInput}
                onChange={(e) => handleSearch(e.target.value)}
              />
            </div>
            {activeCategory && (
              <div className="flex items-center gap-2">
                <Badge tone="primary">{activeCategory.name}</Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => updateParams({ category: null, page: 0 })}
                >
                  Xoá lọc
                </Button>
              </div>
            )}
          </div>

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 mb-4">
              {error}
            </div>
          )}

          {loading ? (
            <SkeletonGrid
              count={6}
              className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5"
            />
          ) : articles.length === 0 ? (
            <Card hover={false}>
              <div className="p-10 text-center text-ink-muted">
                <IconNote size={40} className="mx-auto mb-3" />
                <p className="font-medium">Chưa có bài viết phù hợp</p>
                <p className="text-sm mt-1">
                  Thử xoá bộ lọc hoặc tìm với từ khoá khác.
                </p>
              </div>
            </Card>
          ) : (
            <>
              <p className="text-xs text-ink-muted mb-3">
                {total} bài viết
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                {articles.map((a) => (
                  <NewsCard key={a.id} article={a} />
                ))}
              </div>

              {/* Phân trang */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-6">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page === 0}
                    onClick={() => updateParams({ page: page - 1 })}
                  >
                    <IconArrowLeft size={14} />
                    Trước
                  </Button>
                  <span className="text-sm text-ink-muted px-2">
                    Trang {page + 1} / {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page + 1 >= totalPages}
                    onClick={() => updateParams({ page: page + 1 })}
                  >
                    Sau
                    <IconChevronRight size={14} />
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/** Thẻ bài viết trong danh sách. */
function NewsCard({ article }: { article: NewsArticleResponse }) {
  return (
    <Link to={`/news/${article.slug}`}>
      <Card className="h-full flex flex-col">
        <div className="aspect-[16/9] bg-bgsoft overflow-hidden rounded-t-2xl">
          {article.thumbnailUrl ? (
            <img
              src={article.thumbnailUrl}
              alt={article.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-ink-muted">
              <IconNote size={32} />
            </div>
          )}
        </div>
        <div className="p-4 flex flex-col flex-1">
          <Badge tone="accent" className="self-start mb-2">
            {article.categoryName}
          </Badge>
          <h3 className="font-semibold leading-snug mb-2 line-clamp-3">
            {article.title}
          </h3>
          {article.summary && (
            <p className="text-sm text-ink-light line-clamp-2 mb-3">
              {article.summary}
            </p>
          )}
          <div className="mt-auto flex items-center justify-between gap-2 text-xs text-ink-muted pt-3 border-t border-ink/8">
            <span className="flex items-center gap-1">
              <IconClock size={12} />
              {formatNewsDate(article.publishedAt)}
            </span>
            <span className="flex items-center gap-1">
              <IconEye size={12} />
              {article.viewCount}
            </span>
          </div>
        </div>
      </Card>
    </Link>
  );
}
