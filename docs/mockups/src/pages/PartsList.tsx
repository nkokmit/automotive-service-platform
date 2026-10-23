import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  IconSearch,
  IconStar,
  IconClose,
  IconShoppingBag,
  IconCartPlus,
  IconPackage,
} from "../components/icons";
import Card from "../components/Card";
import Badge from "../components/Badge";
import Button from "../components/Button";
import Input from "../components/Input";
import { SkeletonGrid } from "../components/Loading";
import { useToast } from "../components/Toast";
import { parts, type Part } from "../data/mock";
import {
  addToCart,
  formatCompactVND as compactVND,
  formatFullVND as fullVND,
  getPartDiscountPercent,
  useCartCount,
} from "../data/cartStore";

// =========================
// Filter options (derived từ mock data)
// =========================
const allCategories = Array.from(new Set(parts.map((p) => p.category))).sort();
const allBrands = Array.from(new Set(parts.map((p) => p.brand))).sort();

// Price range từ data
const minPrice = Math.min(...parts.map((p) => p.priceVND));
const maxPrice = Math.max(...parts.map((p) => p.priceVND));

// Bước nhảy cho price slider (50k)
const PRICE_STEP = 50_000;

// =========================
// Sort options
// =========================
const sortOptions = [
  { id: "popular", label: "Phổ biến nhất" },
  { id: "price-asc", label: "Giá tăng dần" },
  { id: "price-desc", label: "Giá giảm dần" },
  { id: "rating", label: "Đánh giá cao" },
  { id: "discount", label: "Giảm giá nhiều" },
] as const;

type SortId = (typeof sortOptions)[number]["id"];

// =========================
// Status filter (Tình trạng)
// =========================
type StatusFilter = "all" | "inStock" | "discount" | "bestSeller";
const statusOptions: { id: StatusFilter; label: string }[] = [
  { id: "all", label: "Tất cả" },
  { id: "inStock", label: "Còn hàng" },
  { id: "discount", label: "Đang giảm giá" },
  { id: "bestSeller", label: "Bán chạy" },
];

// =========================
// Main component
// =========================
export default function PartsList() {
  const [params, setParams] = useSearchParams();
  const t = useToast();

  // Filter state
  const [filters, setFilters] = useState({
    category: "Tất cả" as string,
    brand: "Tất cả" as string,
    maxPrice: maxPrice,
    status: "all" as StatusFilter,
  });
  const [sort, setSort] = useState<SortId>("popular");
  const [query, setQuery] = useState("");

  // Loading state (giả lập API call)
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const id = setTimeout(() => setLoading(false), 500);
    return () => clearTimeout(id);
  }, []);

  // Đọc ?category= từ URL
  useEffect(() => {
    const category = params.get("category");
    if (category && allCategories.includes(category as Part["category"])) {
      setFilters((f) => ({ ...f, category }));
      setParams({}, { replace: true });
    }
  }, [params, setParams]);

  // Cart state — tự động re-render khi cart thay đổi
  const cartCount = useCartCount();

  const filtered = useMemo(() => {
    let result = parts.filter((p) => {
      if (filters.category !== "Tất cả" && p.category !== filters.category)
        return false;
      if (filters.brand !== "Tất cả" && p.brand !== filters.brand) return false;
      if (p.priceVND > filters.maxPrice) return false;
      if (filters.status === "inStock" && p.stockQty <= 0) return false;
      if (filters.status === "discount" && getPartDiscountPercent(p) <= 0)
        return false;
      if (filters.status === "bestSeller" && !p.isBestSeller) return false;
      if (
        query &&
        !`${p.name} ${p.brand} ${p.category} ${p.shortDescription}`
          .toLowerCase()
          .includes(query.toLowerCase())
      )
        return false;
      return true;
    });

    switch (sort) {
      case "price-asc":
        result = [...result].sort((a, b) => a.priceVND - b.priceVND);
        break;
      case "price-desc":
        result = [...result].sort((a, b) => b.priceVND - a.priceVND);
        break;
      case "rating":
        result = [...result].sort((a, b) => b.rating - a.rating);
        break;
      case "discount":
        result = [...result].sort(
          (a, b) => getPartDiscountPercent(b) - getPartDiscountPercent(a),
        );
        break;
      default:
        // popular: ưu tiên isBestSeller + isFeatured + reviewsCount
        result = [...result].sort((a, b) => {
          const scoreA =
            (a.isBestSeller ? 1000 : 0) +
            (a.isFeatured ? 500 : 0) +
            a.reviewsCount;
          const scoreB =
            (b.isBestSeller ? 1000 : 0) +
            (b.isFeatured ? 500 : 0) +
            b.reviewsCount;
          return scoreB - scoreA;
        });
    }
    return result;
  }, [filters, sort, query]);

  const resetFilters = () => {
    setFilters({
      category: "Tất cả",
      brand: "Tất cả",
      maxPrice,
      status: "all",
    });
    setQuery("");
    t.info("Đã xoá tất cả bộ lọc");
  };

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.category !== "Tất cả") count++;
    if (filters.brand !== "Tất cả") count++;
    if (filters.maxPrice < maxPrice) count++;
    if (filters.status !== "all") count++;
    if (query) count++;
    return count;
  }, [filters, query]);

  const handleAddToCart = (p: Part, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addToCart(p.id, 1);
    t.success(`Đã thêm "${p.name}" vào giỏ hàng`);
  };

  return (
    <div className="container-page py-6 md:py-8">
      {/* Breadcrumb */}
      <nav className="text-xs text-ink-muted mb-4 flex items-center gap-2">
        <Link to="/" className="hover:text-primary">
          Trang chủ
        </Link>
        <span>/</span>
        <span className="text-ink">Phụ kiện &amp; phụ tùng</span>
      </nav>

      <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <Badge tone="primary" className="mb-2">
            <IconShoppingBag size={14} /> Phụ kiện &amp; phụ tùng
          </Badge>
          <h1 className="text-2xl md:text-3xl font-bold mb-2">
            Phụ kiện ô tô chính hãng — giao nhanh toàn quốc
          </h1>
          <p className="text-ink-light">
            {loading ? (
              <span className="inline-block w-48 h-4 bg-bgsoft rounded animate-pulse" />
            ) : (
              <>
                <strong className="text-ink">{filtered.length}</strong> /{" "}
                {parts.length} sản phẩm — đổi trả 14 ngày, bảo hành chính
                hãng
              </>
            )}
          </p>
        </div>
        {cartCount > 0 && (
          <Link to="/cart" className="shrink-0">
            <div className="flex items-center gap-2 px-4 h-10 rounded-xl bg-primary/10 text-primary text-sm font-medium hover:bg-primary/15">
              <IconShoppingBag size={16} />
              Giỏ hàng ({cartCount})
            </div>
          </Link>
        )}
      </div>

      {/* Top bar */}
      <div className="flex flex-col md:flex-row gap-3 mb-6">
        <div className="flex-1">
          <Input
            placeholder="Tìm theo tên phụ kiện, thương hiệu, mô tả..."
            leftIcon={<IconSearch size={18} />}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
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
      </div>

      <div className="grid lg:grid-cols-[280px_1fr] gap-6">
        {/* Filter sidebar */}
        <aside className="space-y-6">
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

          <FilterSection title="Danh mục">
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
                <span className="line-clamp-1">{c}</span>
                <span className="text-xs text-ink-muted shrink-0 ml-2">
                  {c === "Tất cả"
                    ? parts.length
                    : parts.filter((p) => p.category === c).length}
                </span>
              </button>
            ))}
          </FilterSection>

          <FilterSection title="Thương hiệu">
            {["Tất cả", ...allBrands].map((b) => (
              <button
                key={b}
                onClick={() => setFilters({ ...filters, brand: b })}
                className={[
                  "flex items-center justify-between w-full text-left text-sm py-1.5 px-2 rounded-lg transition-colors",
                  filters.brand === b
                    ? "bg-bgsoft text-primary font-medium"
                    : "text-ink hover:bg-bgsoft",
                ].join(" ")}
              >
                {b}
                <span className="text-xs text-ink-muted">
                  {b === "Tất cả"
                    ? parts.length
                    : parts.filter((p) => p.brand === b).length}
                </span>
              </button>
            ))}
          </FilterSection>

          <FilterSection title="Tình trạng">
            <div className="flex flex-col gap-1">
              {statusOptions.map((s) => (
                <label
                  key={s.id}
                  className="flex items-center gap-2 text-sm py-1 cursor-pointer"
                >
                  <input
                    type="radio"
                    name="status"
                    checked={filters.status === s.id}
                    onChange={() =>
                      setFilters({ ...filters, status: s.id })
                    }
                    className="accent-primary"
                  />
                  {s.label}
                </label>
              ))}
            </div>
          </FilterSection>

          <FilterSection title="Giá tối đa">
            <div className="text-sm font-medium text-primary mb-2">
              {fullVND(filters.maxPrice)}
            </div>
            <input
              type="range"
              min={minPrice}
              max={maxPrice}
              step={PRICE_STEP}
              value={filters.maxPrice}
              onChange={(e) =>
                setFilters({ ...filters, maxPrice: Number(e.target.value) })
              }
              className="w-full accent-primary"
            />
            <div className="flex justify-between text-xs text-ink-muted mt-1">
              <span>{compactVND(minPrice)}</span>
              <span>{compactVND(maxPrice)}</span>
            </div>
          </FilterSection>

          <Button variant="outline" fullWidth onClick={resetFilters}>
            Xoá bộ lọc
          </Button>
        </aside>

        {/* Results */}
        <div>
          {loading ? (
            <SkeletonGrid count={6} lines={2} />
          ) : filtered.length === 0 ? (
            <EmptyState onReset={resetFilters} />
          ) : (
            <>
              {/* Toolbar trên cùng (mobile) — quick category chips */}
              <div className="lg:hidden flex gap-2 overflow-x-auto pb-3 mb-2 -mx-4 px-4">
                {allCategories.map((c) => (
                  <button
                    key={c}
                    onClick={() => setFilters({ ...filters, category: c })}
                    className={[
                      "shrink-0 px-3 h-9 rounded-full text-sm font-medium border transition-colors",
                      filters.category === c
                        ? "bg-primary text-white border-primary"
                        : "bg-white text-ink border-ink/15",
                    ].join(" ")}
                  >
                    {c}
                  </button>
                ))}
              </div>

              <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-5">
                {filtered.map((part) => (
                  <PartCard
                    key={part.id}
                    part={part}
                    onAddToCart={handleAddToCart}
                  />
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
function PartCard({
  part,
  onAddToCart,
}: {
  part: Part;
  onAddToCart: (p: Part, e: React.MouseEvent) => void;
}) {
  const discount = getPartDiscountPercent(part);
  const inStock = part.stockQty > 0;

  return (
    <Link to={`/parts/${part.slug}`} className="group block h-full">
      <Card className="h-full flex flex-col">
        <div className="relative aspect-square overflow-hidden rounded-t-2xl bg-white">
          <img
            src={part.image}
            alt={part.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
          {/* Badges top-left */}
          <div className="absolute top-2 left-2 flex flex-col gap-1">
            {discount > 0 && (
              <Badge tone="primary">-{discount}%</Badge>
            )}
            {part.isBestSeller && <Badge tone="accent">Bán chạy</Badge>}
            {part.isFeatured && !part.isBestSeller && (
              <Badge tone="accent">Nổi bật</Badge>
            )}
          </div>
          {/* Stock badge top-right */}
          {!inStock && (
            <div className="absolute top-2 right-2">
              <Badge tone="default" className="bg-white/90 backdrop-blur">
                Hết hàng
              </Badge>
            </div>
          )}
        </div>
        <div className="p-4 flex flex-col flex-1">
          <div className="text-[11px] uppercase tracking-wide text-ink-muted mb-1">
            {part.brand} · {part.category}
          </div>
          <h3 className="font-semibold leading-tight mb-1.5 line-clamp-2 group-hover:text-primary transition-colors min-h-[2.6rem]">
            {part.name}
          </h3>
          <p className="text-xs text-ink-light line-clamp-2 mb-3 min-h-[2rem]">
            {part.shortDescription}
          </p>

          <div className="flex items-center gap-1 mb-3 text-xs">
            <IconStar size={14} className="text-accent-hover" />
            <span className="font-semibold text-ink">{part.rating}</span>
            <span className="text-ink-muted">({part.reviewsCount})</span>
            {inStock && (
              <>
                <span className="text-ink-muted mx-1">·</span>
                <span className="text-ink-muted inline-flex items-center gap-0.5">
                  <IconPackage size={12} /> {part.stockQty}
                </span>
              </>
            )}
          </div>

          <div className="mt-auto flex items-end justify-between gap-2 pt-3 border-t border-ink/8">
            <div>
              <div className="text-primary font-bold text-lg leading-tight">
                {compactVND(part.priceVND)}
              </div>
              {part.originalPriceVND && (
                <div className="text-xs text-ink-muted line-through">
                  {compactVND(part.originalPriceVND)}
                </div>
              )}
            </div>
            <Button
              size="sm"
              variant={inStock ? "primary" : "outline"}
              disabled={!inStock}
              onClick={(e) => onAddToCart(part, e)}
              aria-label="Thêm vào giỏ hàng"
            >
              <IconCartPlus size={14} />
            </Button>
          </div>
        </div>
      </Card>
    </Link>
  );
}

function FilterSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h4 className="font-semibold mb-3 text-sm">{title}</h4>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

function EmptyState({ onReset }: { onReset: () => void }) {
  return (
    <Card>
      <div className="p-10 text-center">
        <div className="mx-auto w-16 h-16 rounded-2xl bg-bgsoft flex items-center justify-center mb-4">
          <IconShoppingBag size={32} className="text-ink-muted" />
        </div>
        <p className="font-semibold text-lg mb-1">
          Không tìm thấy phụ kiện phù hợp
        </p>
        <p className="text-sm text-ink-light mb-5 max-w-sm mx-auto">
          Thử điều chỉnh bộ lọc hoặc xoá bộ lọc để xem tất cả {parts.length}{" "}
          sản phẩm đang bán.
        </p>
        <Button variant="outline" onClick={onReset}>
          <IconClose size={16} /> Xoá bộ lọc
        </Button>
      </div>
    </Card>
  );
}
