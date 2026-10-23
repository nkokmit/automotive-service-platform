import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  IconSearch,
  IconClose,
  IconClock,
  IconCalendar,
  IconUser,
  IconArrowRight,
  IconNote,
} from "../components/icons";
import Card from "../components/Card";
import Badge from "../components/Badge";
import Button from "../components/Button";
import Input from "../components/Input";
import { SkeletonGrid } from "../components/Loading";
import { useToast } from "../components/Toast";
import { articles, type Article } from "../data/mock";

// =========================
// Filter options (derived từ mock data)
// =========================
const allCategories = Array.from(new Set(articles.map((a) => a.category))).sort();

// =========================
// Sort options
// =========================
const sortOptions = [
  { id: "newest", label: "Mới nhất" },
  { id: "popular", label: "Đọc nhiều" },
  { id: "shortest", label: "Đọc nhanh" },
] as const;

type SortId = (typeof sortOptions)[number]["id"];

// =========================
// Helpers
// =========================
/** Parse "01/10/2026" -> Date object. */
function parseDate(dateStr: string): Date {
  const [d, mo, y] = dateStr.split("/").map(Number);
  return new Date(y, mo - 1, d);
}

// =========================
// Main component
// =========================
export default function NewsList() {
  const [params, setParams] = useSearchParams();
  const t = useToast();

  const [filters, setFilters] = useState({
    category: "Tất cả" as string,
  });
  const [sort, setSort] = useState<SortId>("newest");
  const [query, setQuery] = useState("");

  // Loading state (giả lập API call)
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const id = setTimeout(() => setLoading(false), 400);
    return () => clearTimeout(id);
  }, []);

  // Đọc ?category= từ URL
  useEffect(() => {
    const category = params.get("category");
    if (category && allCategories.includes(category as Article["category"])) {
      setFilters({ category });
      setParams({}, { replace: true });
    }
  }, [params, setParams]);

  // Article nổi bật (latest featured)
  const featuredArticle = useMemo(() => {
    return articles.find((a) => a.isFeatured) ?? articles[0];
  }, []);

  // Filter + sort
  const filtered = useMemo(() => {
    let result = articles.filter((a) => {
      // Loại trừ article đang hiển thị ở hero
      if (a.id === featuredArticle.id) return false;
      if (filters.category !== "Tất cả" && a.category !== filters.category)
        return false;
      if (
        query &&
        !`${a.title} ${a.excerpt} ${a.category} ${(a.tags ?? []).join(" ")}`
          .toLowerCase()
          .includes(query.toLowerCase())
      )
        return false;
      return true;
    });

    switch (sort) {
      case "newest":
        result = [...result].sort(
          (a, b) =>
            parseDate(b.publishedAt).getTime() -
            parseDate(a.publishedAt).getTime(),
        );
        break;
      case "shortest":
        result = [...result].sort((a, b) => a.readMinutes - b.readMinutes);
        break;
      default:
        // popular: kết hợp featured + recency
        result = [...result].sort((a, b) => {
          const scoreA =
            (a.isFeatured ? 1000 : 0) +
            (a.tags?.length ?? 0) * 50 +
            parseDate(a.publishedAt).getTime() / 1_000_000;
          const scoreB =
            (b.isFeatured ? 1000 : 0) +
            (b.tags?.length ?? 0) * 50 +
            parseDate(b.publishedAt).getTime() / 1_000_000;
          return scoreB - scoreA;
        });
    }
    return result;
  }, [filters, sort, query, featuredArticle.id]);

  const resetFilters = () => {
    setFilters({ category: "Tất cả" });
    setQuery("");
    t.info("Đã xoá bộ lọc");
  };

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.category !== "Tất cả") count++;
    if (query) count++;
    return count;
  }, [filters, query]);

  return (
    <div className="container-page py-6 md:py-8">
      {/* Breadcrumb */}
      <nav className="text-xs text-ink-muted mb-4 flex items-center gap-2">
        <Link to="/" className="hover:text-primary">
          Trang chủ
        </Link>
        <span>/</span>
        <span className="text-ink">Tin tức &amp; bài viết</span>
      </nav>

      {/* Hero */}
      <section className="mb-10">
        <Badge tone="primary" className="mb-3">
          <IconNote size={14} /> Tin tức &amp; kiến thức
        </Badge>
        <h1 className="text-2xl md:text-4xl font-bold mb-2">
          Cẩm nang chăm sóc xe ô tô
        </h1>
        <p className="text-ink-light max-w-2xl">
          Tổng hợp bài viết chuyên môn từ đội ngũ kỹ thuật viên và chuyên gia
          — giúp bạn chăm xe đúng cách, tiết kiệm chi phí.
        </p>
      </section>

      {/* Featured article (hero card) */}
      {!loading && featuredArticle && (
        <Link
          to={`/news/${featuredArticle.slug}`}
          className="group block mb-10"
        >
          <Card className="overflow-hidden hover:shadow-cardHover transition-shadow">
            <div className="grid md:grid-cols-2 gap-0">
              {/* Image */}
              <div className="relative aspect-[16/10] md:aspect-auto overflow-hidden bg-bgsoft">
                <img
                  src={featuredArticle.image}
                  alt={featuredArticle.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <Badge
                  tone="accent"
                  className="absolute top-4 left-4"
                >
                  Nổi bật
                </Badge>
              </div>
              {/* Content */}
              <div className="p-6 md:p-8 flex flex-col justify-center">
                <Badge tone="primary" className="mb-3 self-start">
                  {featuredArticle.category}
                </Badge>
                <h2 className="text-xl md:text-2xl font-bold mb-3 group-hover:text-primary transition-colors leading-tight">
                  {featuredArticle.title}
                </h2>
                <p className="text-ink-light mb-5 line-clamp-3">
                  {featuredArticle.excerpt}
                </p>
                <div className="flex flex-wrap items-center gap-3 text-xs text-ink-muted mb-5">
                  <div className="flex items-center gap-1.5">
                    <img
                      src={featuredArticle.author.avatar}
                      alt={featuredArticle.author.name}
                      className="w-7 h-7 rounded-full object-cover"
                    />
                    <span className="text-ink font-medium">
                      {featuredArticle.author.name}
                    </span>
                  </div>
                  <span>·</span>
                  <div className="flex items-center gap-1">
                    <IconCalendar size={14} />
                    <span>{featuredArticle.publishedAt}</span>
                  </div>
                  <span>·</span>
                  <div className="flex items-center gap-1">
                    <IconClock size={14} />
                    <span>{featuredArticle.readMinutes} phút đọc</span>
                  </div>
                </div>
                <div className="inline-flex items-center gap-1 text-primary font-medium text-sm">
                  Đọc tiếp <IconArrowRight size={16} />
                </div>
              </div>
            </div>
          </Card>
        </Link>
      )}

      {/* Top bar — search + sort */}
      <div className="flex flex-col md:flex-row gap-3 mb-6">
        <div className="flex-1">
          <Input
            placeholder="Tìm bài viết theo tiêu đề, tag, nội dung..."
            leftIcon={<IconSearch size={18} />}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortId)}
          className="h-11 px-3 rounded-xl border border-ink/15 bg-white text-sm font-medium"
          aria-label="Sắp xếp"
        >
          {sortOptions.map((o) => (
            <option key={o.id} value={o.id}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      {/* Category chips — quick filter (mobile + desktop) */}
      <div className="flex gap-2 overflow-x-auto pb-3 mb-6 -mx-4 px-4 lg:mx-0 lg:px-0">
        {["Tất cả", ...allCategories].map((c) => (
          <button
            key={c}
            onClick={() => setFilters({ ...filters, category: c })}
            className={[
              "shrink-0 px-4 h-9 rounded-full text-sm font-medium border transition-colors",
              filters.category === c
                ? "bg-primary text-white border-primary"
                : "bg-white text-ink border-ink/15 hover:bg-bgsoft",
            ].join(" ")}
          >
            {c}
          </button>
        ))}
      </div>

      <div className="grid lg:grid-cols-[260px_1fr] gap-6">
        {/* Sidebar */}
        <aside className="space-y-6 lg:order-2">
          {activeFilterCount > 0 && (
            <div className="bg-bgsoft/60 border border-ink/8 rounded-xl p-3 flex items-center justify-between">
              <span className="text-sm">
                <strong className="text-primary">{activeFilterCount}</strong>{" "}
                bộ lọc đang áp dụng
              </span>
              <button
                onClick={resetFilters}
                className="text-xs text-primary hover:underline font-medium"
              >
                Xoá hết
              </button>
            </div>
          )}

          <SidebarSection title="Chuyên mục">
            <div className="space-y-1">
              {["Tất cả", ...allCategories].map((c) => (
                <button
                  key={c}
                  onClick={() => setFilters({ ...filters, category: c })}
                  className={[
                    "flex items-center justify-between w-full text-left text-sm py-1.5 px-2 rounded-lg transition-colors",
                    filters.category === c
                      ? "bg-bgsoft text-primary font-medium"
                      : "text-ink hover:bg-bgsoft",
                  ].join(" ")}
                >
                  <span>{c}</span>
                  <span className="text-xs text-ink-muted shrink-0 ml-2">
                    {c === "Tất cả"
                      ? articles.length
                      : articles.filter((a) => a.category === c).length}
                  </span>
                </button>
              ))}
            </div>
          </SidebarSection>

          <SidebarSection title="Bài viết nổi bật">
            <div className="space-y-3">
              {articles
                .filter((a) => a.isFeatured)
                .slice(0, 3)
                .map((a) => (
                  <Link
                    key={a.id}
                    to={`/news/${a.slug}`}
                    className="group flex gap-3"
                  >
                    <div className="w-16 h-16 rounded-lg overflow-hidden bg-bgsoft shrink-0">
                      <img
                        src={a.image}
                        alt={a.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-medium leading-tight line-clamp-2 group-hover:text-primary transition-colors">
                        {a.title}
                      </h4>
                      <div className="text-xs text-ink-muted mt-1">
                        {a.readMinutes} phút đọc
                      </div>
                    </div>
                  </Link>
                ))}
            </div>
          </SidebarSection>

          <SidebarSection title="Tag phổ biến">
            <div className="flex flex-wrap gap-2">
              {Array.from(
                new Set(articles.flatMap((a) => a.tags ?? [])),
              )
                .slice(0, 12)
                .map((tag) => (
                  <button
                    key={tag}
                    onClick={() => setQuery(tag)}
                    className="px-3 h-7 rounded-full bg-bgsoft text-xs text-ink hover:bg-primary hover:text-white transition-colors"
                  >
                    #{tag}
                  </button>
                ))}
            </div>
          </SidebarSection>
        </aside>

        {/* Main grid */}
        <div className="lg:order-1">
          {loading ? (
            <SkeletonGrid
              count={6}
              hasImage
              lines={2}
              className="grid sm:grid-cols-2 gap-5"
            />
          ) : filtered.length === 0 ? (
            <EmptyState onReset={resetFilters} />
          ) : (
            <>
              <div className="text-sm text-ink-light mb-4">
                <strong className="text-ink">{filtered.length}</strong> bài
                viết
                {filters.category !== "Tất cả" && (
                  <> trong <strong className="text-ink">{filters.category}</strong></>
                )}
              </div>
              <div className="grid sm:grid-cols-2 gap-5">
                {filtered.map((article) => (
                  <ArticleCard key={article.id} article={article} />
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// =========================
// Subcomponents
// =========================
function ArticleCard({ article }: { article: Article }) {
  return (
    <Link
      to={`/news/${article.slug}`}
      className="group block h-full"
    >
      <Card className="h-full flex flex-col hover:shadow-cardHover transition-shadow">
        {/* Image */}
        <div className="relative aspect-[16/10] overflow-hidden rounded-t-2xl bg-bgsoft">
          <img
            src={article.image}
            alt={article.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
          <div className="absolute top-3 left-3">
            <Badge tone="primary">{article.category}</Badge>
          </div>
        </div>

        {/* Content */}
        <div className="p-5 flex flex-col flex-1">
          <h3 className="font-semibold leading-tight mb-2 line-clamp-2 group-hover:text-primary transition-colors min-h-[2.6rem]">
            {article.title}
          </h3>
          <p className="text-sm text-ink-light line-clamp-2 mb-4 min-h-[2.5rem]">
            {article.excerpt}
          </p>

          {/* Author + date */}
          <div className="mt-auto flex items-center gap-2 pt-3 border-t border-ink/8">
            <img
              src={article.author.avatar}
              alt={article.author.name}
              className="w-7 h-7 rounded-full object-cover shrink-0"
            />
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium text-ink line-clamp-1">
                {article.author.name}
              </div>
              <div className="text-xs text-ink-muted flex items-center gap-2">
                <span className="flex items-center gap-1">
                  <IconCalendar size={11} /> {article.publishedAt}
                </span>
                <span>·</span>
                <span className="flex items-center gap-1">
                  <IconClock size={11} /> {article.readMinutes} phút
                </span>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </Link>
  );
}

function SidebarSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h4 className="font-semibold mb-3 text-sm">{title}</h4>
      {children}
    </div>
  );
}

function EmptyState({ onReset }: { onReset: () => void }) {
  return (
    <Card>
      <div className="p-10 text-center">
        <div className="mx-auto w-16 h-16 rounded-2xl bg-bgsoft flex items-center justify-center mb-4">
          <IconUser size={32} className="text-ink-muted" />
        </div>
        <p className="font-semibold text-lg mb-1">
          Không tìm thấy bài viết phù hợp
        </p>
        <p className="text-sm text-ink-light mb-5 max-w-sm mx-auto">
          Thử điều chỉnh từ khoá hoặc chọn chuyên mục khác.
        </p>
        <Button variant="outline" onClick={onReset}>
          <IconClose size={16} /> Xoá bộ lọc
        </Button>
      </div>
    </Card>
  );
}