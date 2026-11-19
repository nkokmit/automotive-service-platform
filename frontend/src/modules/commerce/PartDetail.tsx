import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  IconShoppingBag,
  IconStar,
  IconArrowRight,
  IconCheck,
  IconShield,
  IconTruck,
  IconRefresh,
  IconCartPlus,
  IconPackage,
  IconCar,
  IconClose,
  IconPlus,
  IconMinus,
  IconBolt,
} from "../../components/icons";
import Card from "../../components/Card";
import Badge from "../../components/Badge";
import Button from "../../components/Button";
import { Skeleton } from "../../components/Loading";
import { useToast } from "../../components/Toast";
import RecommendationWidget from "../../components/RecommendationWidget";
import { GARAGE } from "../../config/garage";
import { useCatalog, type CatalogPart } from "../../data/catalog";
import { useAuth } from "../../data/authStore";
import { recommendForPart } from "../../data/recommend";
import { inventoryApi } from "../../api/endpoints/inventory";
import type { PartCompatibilityResponse } from "../../api/types";
import {
  addToCart,
  setCartQty,
  formatCompactVND as compactVND,
  formatFullVND as fullVND,
  getPartDiscountPercent,
  useCartCount,
} from "../../data/cartStore";

// =========================
// Mock reviews (dùng chung cho mọi part — sẽ wrap useReviews(partId))
// =========================
const mockReviews = [
  {
    id: "pr1",
    author: "Nguyễn Văn Mua",
    avatar:
      "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=70",
    rating: 5,
    date: "22/09/2026",
    content:
      "Đóng gói cẩn thận, giao nhanh 2 ngày. Hàng chính hãng, sử dụng thấy chất lượng khác hẳn hàng trôi nổi.",
  },
  {
    id: "pr2",
    author: "Phạm Minh T.",
    avatar:
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=70",
    rating: 4,
    date: "15/09/2026",
    content:
      "Giá cạnh tranh, shop tư vấn nhiệt tình. Lắp vừa khít xe, không phải cắt gọt gì.",
  },
  {
    id: "pr3",
    author: "Lê Hoàng K.",
    avatar:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=70",
    rating: 5,
    date: "08/09/2026",
    content:
      "Mua lần thứ 3 ở AutoCare, lần nào cũng hài lòng. Sẽ tiếp tục ủng hộ.",
  },
];

// =========================
// Sub-component: SpecRow
// =========================
function SpecRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-ink/8 last:border-b-0">
      <div className="w-8 h-8 rounded-lg bg-bgsoft flex items-center justify-center shrink-0 text-ink">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-xs text-ink-muted">{label}</div>
        <div className="text-sm font-medium text-ink mt-0.5">{value}</div>
      </div>
    </div>
  );
}

// =========================
// Sub-component: QtySelector
// =========================
function QtySelector({
  value,
  max,
  onChange,
  disabled,
}: {
  value: number;
  max: number;
  onChange: (v: number) => void;
  disabled?: boolean;
}) {
  return (
    <div className="inline-flex items-center border border-ink/15 rounded-xl overflow-hidden bg-white">
      <button
        type="button"
        onClick={() => onChange(Math.max(1, value - 1))}
        disabled={disabled || value <= 1}
        className="w-10 h-10 flex items-center justify-center text-ink-muted hover:bg-bgsoft disabled:opacity-40 disabled:cursor-not-allowed"
        aria-label="Giảm số lượng"
      >
        <IconMinus size={16} />
      </button>
      <input
        type="number"
        value={value}
        min={1}
        max={max}
        onChange={(e) => {
          const n = parseInt(e.target.value, 10);
          if (Number.isNaN(n)) return;
          onChange(Math.max(1, Math.min(n, max)));
        }}
        disabled={disabled}
        className="w-14 text-center text-sm font-semibold outline-none bg-transparent"
        aria-label="Số lượng"
      />
      <button
        type="button"
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={disabled || value >= max}
        className="w-10 h-10 flex items-center justify-center text-ink-muted hover:bg-bgsoft disabled:opacity-40 disabled:cursor-not-allowed"
        aria-label="Tăng số lượng"
      >
        <IconPlus size={16} />
      </button>
    </div>
  );
}

// =========================
// Sub-component: PartCard (dùng cho similar)
// =========================
function PartCardSmall({ part }: { part: CatalogPart }) {
  const discount = getPartDiscountPercent(part);
  return (
    <Link to={`/parts/${part.slug}`} className="group block h-full">
      <Card className="h-full flex flex-col">
        <div className="relative aspect-square overflow-hidden rounded-t-2xl bg-white">
          <img
            src={part.image}
            alt={part.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
          {discount > 0 && (
            <Badge tone="primary" className="absolute top-2 left-2">
              -{discount}%
            </Badge>
          )}
        </div>
        <div className="p-3 flex-1 flex flex-col">
          <div className="text-[11px] uppercase tracking-wide text-ink-muted mb-1">
            {part.brand}
          </div>
          <h4 className="font-semibold text-sm leading-tight mb-2 line-clamp-2 group-hover:text-primary transition-colors min-h-[2.4rem]">
            {part.name}
          </h4>
          <div className="mt-auto flex items-end justify-between">
            <div className="text-primary font-bold text-sm">
              {compactVND(part.priceVND)}
            </div>
            <div className="flex items-center gap-1 text-xs text-ink-muted">
              <IconStar size={12} className="text-accent-hover" />
              <span className="font-medium text-ink">{part.rating}</span>
            </div>
          </div>
        </div>
      </Card>
    </Link>
  );
}

// =========================
// Main component
// =========================
export default function PartDetail() {
  const { slug } = useParams();
  const t = useToast();
  const navigate = useNavigate();
  const { parts, loading: catalogLoading, usingFallback } = useCatalog();
  const { user } = useAuth();

  // Tìm part theo slug trong catalog đang hiển thị (API thật hoặc fallback)
  const part = useMemo(
    () => parts.find((p) => p.slug === slug) ?? null,
    [parts, slug],
  );

  // Qty state
  const [qty, setQty] = useState(1);
  useEffect(() => {
    setQty(1);
  }, [slug]);

  // Buy-now / add-to-cart state
  const [showSuccess, setShowSuccess] = useState<{
    title: string;
    message: string;
  } | null>(null);

  // Similar: dùng RecommendationWidget (smart engine) trên pool catalog hiện tại.
  // Hook phải nằm TRƯỚC mọi early-return để không vi phạm rules of hooks.
  const similarRecommendations = useMemo(
    () => (part ? recommendForPart(part.id, 4, parts) : []),
    [part, parts],
  );

  // Dòng xe tương thích — `GET /api/parts/{id}/compatibilities`.
  const [compatibilities, setCompatibilities] = useState<
    PartCompatibilityResponse[]
  >([]);
  const [compatLoading, setCompatLoading] = useState(false);
  const [compatError, setCompatError] = useState<string | null>(null);

  useEffect(() => {
    // Catalog rơi về dữ liệu mẫu → id không phải UUID thật, gọi API vô nghĩa.
    if (!part || usingFallback) return;
    let cancelled = false;
    setCompatLoading(true);
    setCompatError(null);
    inventoryApi
      .getPartCompatibilities(part.id)
      .then((data) => {
        if (cancelled) return;
        setCompatibilities(Array.isArray(data) ? data : []);
      })
      .catch((err) => {
        if (cancelled) return;
        setCompatibilities([]);
        setCompatError(
          err instanceof Error
            ? err.message
            : "Không tải được danh sách xe tương thích",
        );
      })
      .finally(() => {
        if (!cancelled) setCompatLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [part, usingFallback]);

  // =========================
  // RENDER BRANCHES
  // =========================

  if (catalogLoading) {
    return (
      <div className="container-page py-6 md:py-8">
        <div className="grid lg:grid-cols-[1fr_380px] gap-6">
          <div>
            <Skeleton className="h-6 w-32 mb-4" />
            <Skeleton className="aspect-square w-full rounded-2xl" />
            <div className="mt-6 space-y-3">
              <Skeleton className="h-8 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
            </div>
          </div>
          <div>
            <Skeleton className="h-72 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (!part) {
    return (
      <div className="container-page py-12">
        <div className="bg-white border border-ink/10 rounded-2xl p-10 text-center max-w-md mx-auto">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-bgsoft flex items-center justify-center mb-4">
            <IconShoppingBag size={32} className="text-ink-muted" />
          </div>
          <p className="text-xs uppercase tracking-wider text-primary font-semibold mb-2">
            404 — Không tìm thấy sản phẩm
          </p>
          <h1 className="text-xl font-bold mb-2">
            Phụ kiện không tồn tại hoặc đã ngừng bán
          </h1>
          <p className="text-sm text-ink-light mb-6">
            Slug <code className="bg-bgsoft px-1.5 py-0.5 rounded">{slug}</code>{" "}
            không có trong hệ thống.
          </p>
          <div className="flex flex-wrap gap-2 justify-center">
            <Link to="/parts">
              <Button>Xem phụ kiện khác</Button>
            </Link>
            <Link to="/">
              <Button variant="outline">Về trang chủ</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Từ đây part chắc chắn !== null
  const discount = getPartDiscountPercent(part);
  const inStock = part.stockQty > 0;

  const handleAddToCart = (showModal: boolean = false) => {
    // Chưa đăng nhập thì không cho thêm hàng — dẫn sang trang đăng nhập.
    if (!user) {
      t.info("Vui lòng đăng nhập để mua phụ tùng");
      navigate("/login", { state: { from: `/parts/${slug}` } });
      return;
    }
    addToCart(part.id, qty);
    if (showModal) {
      setShowSuccess({
        title: "Đã thêm vào giỏ hàng",
        message: `${qty} × ${part.name}`,
      });
    } else {
      t.success(`Đã thêm ${qty} × "${part.name}" vào giỏ hàng`);
    }
  };

  const handleBuyNow = () => {
    if (!user) {
      t.info("Vui lòng đăng nhập để mua phụ tùng");
      navigate("/login", { state: { from: `/parts/${slug}` } });
      return;
    }
    // Đảm bảo giỏ có đúng số lượng người dùng chọn rồi chuyển sang checkout
    setCartQty(part.id, qty);
    t.success(`Đã chuyển ${qty} × "${part.name}" sang trang thanh toán`);
    navigate("/checkout");
  };

  return (
    <div className="container-page py-6 md:py-8">
      {/* Breadcrumb */}
      <nav className="text-xs text-ink-muted mb-4 flex items-center gap-2">
        <Link to="/" className="hover:text-primary">
          Trang chủ
        </Link>
        <span>/</span>
        <Link to="/parts" className="hover:text-primary">
          Phụ kiện
        </Link>
        <span>/</span>
        <Link
          to={`/parts?category=${encodeURIComponent(part.category)}`}
          className="hover:text-primary"
        >
          {part.category}
        </Link>
        <span>/</span>
        <span className="text-ink line-clamp-1">{part.name}</span>
      </nav>

      {usingFallback && (
        <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Đang hiển thị sản phẩm mẫu. Giá và tồn kho sẽ cập nhật khi kết nối
          được máy chủ.
        </div>
      )}

      <div className="grid lg:grid-cols-[1fr_380px] gap-6">
        {/* ============= LEFT ============= */}
        <div>
          {/* Image */}
          <div className="relative aspect-square rounded-2xl overflow-hidden bg-white border border-ink/8">
            <img
              src={part.image}
              alt={part.name}
              className="w-full h-full object-contain p-4"
            />
            {/* Badges */}
            <div className="absolute top-3 left-3 flex flex-col gap-1">
              {discount > 0 && <Badge tone="primary">-{discount}%</Badge>}
              {part.isBestSeller && <Badge tone="accent">Bán chạy</Badge>}
              {part.isFeatured && !part.isBestSeller && (
                <Badge tone="accent">Nổi bật</Badge>
              )}
            </div>
          </div>

          {/* Title + meta */}
          <div className="mt-6">
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <Badge tone="default">{part.brand}</Badge>
              <Badge tone="default">{part.category}</Badge>
              {inStock ? (
                <Badge tone="primary">
                  <IconPackage size={12} /> Còn {part.stockQty} sản phẩm
                </Badge>
              ) : (
                <Badge tone="warning">Hết hàng</Badge>
              )}
            </div>
            <h1 className="text-2xl md:text-3xl font-bold leading-tight mb-3">
              {part.name}
            </h1>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-ink-light">
              {part.rating > 0 && (
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <IconStar
                      key={s}
                      size={16}
                      className={
                        s <= Math.round(part.rating)
                          ? "text-accent-hover"
                          : "text-ink/15"
                      }
                    />
                  ))}
                  <span className="font-semibold text-ink ml-1">
                    {part.rating}
                  </span>
                  <span className="text-ink-muted">
                    ({part.reviewsCount} đánh giá)
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Specs */}
          <Card hover={false} className="mt-6">
            <div className="p-5">
              <h2 className="font-semibold mb-2 flex items-center gap-2">
                <IconBolt size={18} className="text-primary" />
                Thông số sản phẩm
              </h2>
              <div className="grid sm:grid-cols-2 gap-x-6">
                <SpecRow
                  icon={<IconShoppingBag size={16} />}
                  label="Danh mục"
                  value={part.category}
                />
                <SpecRow
                  icon={<IconShield size={16} />}
                  label="Thương hiệu"
                  value={part.brand}
                />
                <SpecRow
                  icon={<IconPackage size={16} />}
                  label="Mã sản phẩm"
                  value={part.sku}
                />
                <SpecRow
                  icon={<IconShoppingBag size={16} />}
                  label="Đơn vị"
                  value={part.unit}
                />
                <SpecRow
                  icon={<IconPackage size={16} />}
                  label="Tình trạng kho"
                  value={
                    inStock
                      ? `Còn ${part.stockQty} sản phẩm`
                      : "Hết hàng"
                  }
                />
                {part.rating > 0 && (
                  <SpecRow
                    icon={<IconStar size={16} />}
                    label="Đánh giá"
                    value={`${part.rating} / 5 (${part.reviewsCount} reviews)`}
                  />
                )}
                {part.isBestSeller && (
                  <SpecRow
                    icon={<IconCheck size={16} />}
                    label="Trạng thái"
                    value="Sản phẩm bán chạy"
                  />
                )}
                {part.originalPriceVND && (
                  <SpecRow
                    icon={<IconBolt size={16} />}
                    label="Giảm giá"
                    value={`${discount}% so với giá gốc`}
                  />
                )}
              </div>
            </div>
          </Card>

          {/* Description */}
          <div className="mt-6">
            <h2 className="font-semibold mb-3 flex items-center gap-2">
              <IconCheck size={18} className="text-primary" />
              Mô tả sản phẩm
            </h2>
            <div className="prose prose-sm max-w-none">
              <p className="text-ink-light leading-relaxed">
                {part.shortDescription}
              </p>
              <p className="text-ink-light leading-relaxed mt-3">
                Sản phẩm chính hãng <strong>{part.brand}</strong>, được nhập
                trực tiếp từ nhà sản xuất. Cam kết đổi trả miễn phí trong 14
                ngày nếu có lỗi từ nhà sản xuất. Bảo hành chính hãng toàn
                quốc.
              </p>
              <p className="text-ink-light leading-relaxed mt-3">
                Lắp đặt tại <strong>{GARAGE.name}</strong> — {GARAGE.address},{" "}
                {GARAGE.district}. Liên hệ hotline <strong>{GARAGE.hotline}</strong>{" "}
                để được tư vấn chi tiết.
              </p>
            </div>
          </div>

          {/* Compatible cars — GET /api/parts/{id}/compatibilities */}
          <Card hover={false} className="mt-6">
            <div className="p-5">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-semibold flex items-center gap-2">
                  <IconCar size={18} className="text-primary" />
                  Xe tương thích
                </h2>
                {compatibilities.length > 0 && (
                  <span className="text-[11px] text-ink-muted">
                    {compatibilities.length} dòng xe
                  </span>
                )}
              </div>

              {compatLoading ? (
                <div className="flex flex-wrap gap-2">
                  {[1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      className="h-9 w-28 bg-bgsoft rounded-full animate-pulse"
                    />
                  ))}
                </div>
              ) : compatError ? (
                <p className="text-sm text-ink-muted p-3 bg-bgsoft rounded-lg flex items-start gap-2">
                  <IconRefresh size={14} className="shrink-0 mt-0.5" />
                  <span>Không tải được danh sách xe tương thích từ máy chủ.</span>
                </p>
              ) : compatibilities.length === 0 ? (
                <p className="text-sm text-ink-muted p-3 bg-bgsoft rounded-lg">
                  Chưa có dữ liệu dòng xe tương thích cho sản phẩm này. Vui
                  lòng liên hệ {GARAGE.name} để được tư vấn chính xác.
                </p>
              ) : (
                <>
                  <p className="text-xs text-ink-muted mb-3">
                    Sản phẩm phù hợp với các dòng xe sau (có thể cần thêm phụ
                    kiện lắp đặt):
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {compatibilities.map((c) => {
                      const label = `${c.vehicleBrand} ${c.vehicleModel}`;
                      const years =
                        c.yearFrom != null || c.yearTo != null
                          ? ` (${c.yearFrom ?? "..."}–${c.yearTo ?? "..."})`
                          : "";
                      return (
                        <Link
                          key={c.id}
                          to={`/cars?brand=${encodeURIComponent(c.vehicleBrand)}`}
                          className="inline-flex items-center gap-1 px-3 h-9 rounded-full bg-bgsoft text-sm text-ink hover:bg-primary hover:text-white transition-colors"
                        >
                          <IconCar size={14} />
                          {label}
                          {years && (
                            <span className="text-xs opacity-70">{years}</span>
                          )}
                        </Link>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          </Card>

          {/* Trust / shipping */}
          <Card hover={false} className="mt-6 bg-bgsoft/40">
            <div className="p-5">
              <h2 className="font-semibold mb-3 flex items-center gap-2">
                <IconShield size={18} className="text-primary" />
                Cam kết từ AutoCare
              </h2>
              <ul className="space-y-2 text-sm text-ink-light">
                <li className="flex items-start gap-2">
                  <IconTruck size={16} className="text-primary shrink-0 mt-0.5" />
                  Giao hàng toàn quốc trong 2–5 ngày, miễn phí vận chuyển cho
                  đơn từ 500.000đ.
                </li>
                <li className="flex items-start gap-2">
                  <IconRefresh
                    size={16}
                    className="text-primary shrink-0 mt-0.5"
                  />
                  Đổi trả miễn phí trong 14 ngày nếu sản phẩm lỗi.
                </li>
                <li className="flex items-start gap-2">
                  <IconShield
                    size={16}
                    className="text-primary shrink-0 mt-0.5"
                  />
                  Bảo hành chính hãng theo từng thương hiệu.
                </li>
                <li className="flex items-start gap-2">
                  <IconCheck
                    size={16}
                    className="text-primary shrink-0 mt-0.5"
                  />
                  Lắp đặt và bảo hành tại {GARAGE.name}.
                </li>
              </ul>
            </div>
          </Card>

          {/* Reviews */}
          <div className="mt-6">
            <h2 className="font-semibold mb-3 flex items-center gap-2">
              <IconStar size={18} className="text-primary" />
              Đánh giá từ khách hàng ({mockReviews.length})
            </h2>
            <div className="space-y-3">
              {mockReviews.map((r) => (
                <Card key={r.id} hover={false}>
                  <div className="p-4 flex gap-3">
                    <img
                      src={r.avatar}
                      alt={r.author}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-sm">{r.author}</span>
                        <span className="text-xs text-ink-muted">{r.date}</span>
                      </div>
                      <div className="flex items-center gap-1 mb-2">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <IconStar
                            key={s}
                            size={14}
                            className={
                              s <= r.rating
                                ? "text-accent-hover"
                                : "text-ink/15"
                            }
                          />
                        ))}
                      </div>
                      <p className="text-sm text-ink-light">{r.content}</p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>

          {/* Related parts — smart engine */}
          {similarRecommendations.length > 0 && (
            <div className="mt-8">
              <RecommendationWidget
                items={similarRecommendations}
                title="Sản phẩm liên quan"
                subtitle={`Phụ kiện tương thích với "${part.name}" — cùng danh mục, cùng dòng xe`}
                viewAllHref={`/parts?category=${encodeURIComponent(part.category)}`}
                viewAllLabel={`Xem tất cả ${part.category}`}
              />
            </div>
          )}
        </div>

        {/* ============= RIGHT: sticky purchase card ============= */}
        <div className="lg:sticky lg:top-20 lg:self-start space-y-4">
          <Card>
            <div className="p-5">
              {/* Price block */}
              <div className="flex items-baseline gap-2 mb-1">
                <span className="text-3xl font-bold text-primary">
                  {compactVND(part.priceVND)}
                </span>
                {part.originalPriceVND && (
                  <>
                    <span className="text-sm text-ink-muted line-through">
                      {compactVND(part.originalPriceVND)}
                    </span>
                    {discount > 0 && (
                      <Badge tone="primary">-{discount}%</Badge>
                    )}
                  </>
                )}
              </div>
              <div className="text-xs text-ink-muted mb-4">
                ({fullVND(part.priceVND)}) · Đã bao gồm VAT
              </div>

              <div className="my-4 border-t border-ink/8" />

              {/* Short description */}
              <p className="text-sm text-ink-light leading-relaxed mb-4">
                {part.shortDescription}
              </p>

              {/* Qty selector */}
              <div className="mb-4">
                <label className="text-sm font-medium mb-2 block">
                  Số lượng
                </label>
                <div className="flex items-center justify-between gap-2">
                  <QtySelector
                    value={qty}
                    max={Math.max(1, part.stockQty)}
                    onChange={setQty}
                    disabled={!inStock}
                  />
                  <span className="text-xs text-ink-muted">
                    {inStock ? `Còn ${part.stockQty} sản phẩm` : "Hết hàng"}
                  </span>
                </div>
              </div>

              {/* CTAs */}
              <div className="space-y-2">
                <Button
                  size="lg"
                  fullWidth
                  disabled={!inStock}
                  onClick={() => handleAddToCart(false)}
                >
                  <IconCartPlus size={16} />
                  Thêm vào giỏ hàng
                </Button>
                <Button
                  size="lg"
                  variant="secondary"
                  fullWidth
                  disabled={!inStock}
                  onClick={handleBuyNow}
                >
                  <IconBolt size={16} />
                  Mua ngay
                </Button>
              </div>

              <p className="text-xs text-ink-muted text-center mt-3">
                Miễn phí vận chuyển cho đơn từ 500.000đ
              </p>
            </div>
          </Card>

          {/* Shipping card */}
          <Card hover={false} className="bg-bgsoft/40">
            <div className="p-4 space-y-2.5 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
                  <IconTruck size={14} />
                </div>
                <div>
                  <div className="text-ink-light">Giao hàng nhanh 2-5 ngày</div>
                  <div className="text-xs text-ink-muted">
                    Toàn quốc, nhận hàng tận nơi
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
                  <IconRefresh size={14} />
                </div>
                <div>
                  <div className="text-ink-light">Đổi trả 14 ngày</div>
                  <div className="text-xs text-ink-muted">
                    Miễn phí nếu lỗi nhà sản xuất
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
                  <IconShield size={14} />
                </div>
                <div>
                  <div className="text-ink-light">Bảo hành chính hãng</div>
                  <div className="text-xs text-ink-muted">
                    Theo chính sách từng thương hiệu
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* ============= MODAL: Success (sau khi thêm giỏ) ============= */}
      {showSuccess && (
        <div
          className="fixed inset-0 z-50 bg-ink/50 flex items-center justify-center p-4"
          onClick={() => setShowSuccess(null)}
        >
          <div
            className="bg-white rounded-2xl max-w-md w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 rounded-full bg-accent flex items-center justify-center">
                <IconCheck size={24} className="text-ink" />
              </div>
              <button
                type="button"
                onClick={() => setShowSuccess(null)}
                aria-label="Đóng"
                className="p-1 rounded-md hover:bg-bgsoft text-ink-muted"
              >
                <IconClose size={20} />
              </button>
            </div>
            <h3 className="font-bold text-lg mb-1">{showSuccess.title}</h3>
            <p className="text-sm text-ink-light mb-6">{showSuccess.message}</p>
            <div className="space-y-2">
              <Link to="/cart" className="block">
                <Button fullWidth size="lg" onClick={() => setShowSuccess(null)}>
                  <IconShoppingBag size={16} />
                  Xem giỏ hàng
                </Button>
              </Link>
              <Button
                fullWidth
                size="md"
                variant="outline"
                onClick={() => setShowSuccess(null)}
              >
                Tiếp mua sắm
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
