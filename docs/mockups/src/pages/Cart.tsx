import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  IconCart,
  IconTrash,
  IconClose,
  IconArrowRight,
  IconArrowLeft,
  IconSale,
  IconStar,
  IconPackage,
  IconShoppingBag,
  IconShield,
  IconCheck,
  IconTag,
  IconNote,
} from "../components/icons";
import Card from "../components/Card";
import Badge from "../components/Badge";
import Button from "../components/Button";
import Input from "../components/Input";
import { useToast } from "../components/Toast";
import RecommendationWidget from "../components/RecommendationWidget";
import { type Part } from "../data/mock";
import {
  useCartLines,
  setCartQty,
  removeFromCart,
  clearCart,
  formatCompactVND as compactVND,
  formatFullVND as fullVND,
  getPartDiscountPercent,
} from "../data/cartStore";
import { recommendForCart } from "../data/recommend";

// =========================
// Promotions
// =========================
type Promo = {
  code: string;
  description: string;
  type: "percent" | "fixed";
  value: number; // % hoặc VND
  minOrderVND?: number;
};

const PROMOS: Promo[] = [
  {
    code: "AUTO10",
    description: "Giảm 10% (tối đa 500.000đ)",
    type: "percent",
    value: 10,
    minOrderVND: 1_000_000,
  },
  {
    code: "WELCOME200",
    description: "Giảm ngay 200.000đ cho đơn từ 500.000đ",
    type: "fixed",
    value: 200_000,
    minOrderVND: 500_000,
  },
  {
    code: "FREESHIP",
    description: "Miễn phí vận chuyển (giao tiêu chuẩn)",
    type: "fixed",
    value: 30_000,
  },
];

// =========================
// Shipping fee (mirror với checkout)
// =========================
const FREE_SHIP_THRESHOLD = 500_000;
const STANDARD_SHIP_FEE = 30_000;
const EXPRESS_SHIP_FEE = 50_000;

// =========================
// Main component
// =========================
export default function Cart() {
  const t = useToast();
  const lines = useCartLines();

  // Selection state (mặc định chọn tất cả)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    () => new Set(lines.map((l) => l.part.id)),
  );

  // Khi lines thay đổi (cart thay đổi), nếu có item mới chưa chọn → auto chọn
  useEffect(() => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      for (const line of lines) {
        if (!lines.some((l) => l.part.id === line.part.id && !next.has(l.part.id))) {
          // No-op, chỉ placeholder
        }
      }
      // Auto-select tất cả item hiện có nếu trước đó user chưa có selection
      if (next.size === 0) {
        for (const line of lines) next.add(line.part.id);
      }
      return next;
    });
  }, [lines]);

  // Promo state
  const [promoInput, setPromoInput] = useState("");
  const [appliedPromo, setAppliedPromo] = useState<Promo | null>(null);
  const [promoError, setPromoError] = useState("");

  // Filter chỉ những line được chọn
  const selectedLines = useMemo(
    () => lines.filter((l) => selectedIds.has(l.part.id)),
    [lines, selectedIds],
  );

  const subtotal = useMemo(
    () => selectedLines.reduce((s, l) => s + l.lineTotal, 0),
    [selectedLines],
  );

  const totalCount = useMemo(
    () => selectedLines.reduce((s, l) => s + l.qty, 0),
    [selectedLines],
  );

  // Tính discount
  const discount = useMemo(() => {
    if (!appliedPromo) return 0;
    if (appliedPromo.minOrderVND && subtotal < appliedPromo.minOrderVND) return 0;
    if (appliedPromo.type === "percent") {
      return Math.min(
        Math.round(subtotal * (appliedPromo.value / 100)),
        500_000, // cap cho AUTO10
      );
    }
    return appliedPromo.value;
  }, [appliedPromo, subtotal]);

  // Tính phí ship dựa trên subtotal
  const shipFee = useMemo(() => {
    if (appliedPromo?.code === "FREESHIP") return 0;
    if (subtotal >= FREE_SHIP_THRESHOLD) return 0;
    return STANDARD_SHIP_FEE;
  }, [subtotal, appliedPromo]);

  const total = Math.max(0, subtotal - discount + shipFee);

  // =========================
  // Handlers
  // =========================
  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === lines.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(lines.map((l) => l.part.id)));
    }
  };

  const handleQtyChange = (id: string, qty: number) => {
    if (qty < 1) {
      removeFromCart(id);
      t.info("Đã xoá sản phẩm khỏi giỏ hàng");
    } else {
      setCartQty(id, qty);
    }
  };

  const handleRemove = (id: string, name: string) => {
    removeFromCart(id);
    t.info(`Đã xoá "${name}" khỏi giỏ hàng`);
  };

  const handleRemoveSelected = () => {
    if (selectedIds.size === 0) return;
    const count = selectedIds.size;
    selectedIds.forEach((id) => removeFromCart(id));
    setSelectedIds(new Set());
    t.info(`Đã xoá ${count} sản phẩm khỏi giỏ hàng`);
  };

  const handleClearAll = () => {
    if (lines.length === 0) return;
    clearCart();
    setSelectedIds(new Set());
    t.info("Đã xoá toàn bộ giỏ hàng");
  };

  const handleApplyPromo = () => {
    const code = promoInput.trim().toUpperCase();
    if (!code) {
      setPromoError("Vui lòng nhập mã giảm giá");
      return;
    }
    const promo = PROMOS.find((p) => p.code === code);
    if (!promo) {
      setPromoError("Mã giảm giá không hợp lệ hoặc đã hết hạn");
      return;
    }
    if (promo.minOrderVND && subtotal < promo.minOrderVND) {
      setPromoError(
        `Mã này yêu cầu đơn tối thiểu ${compactVND(promo.minOrderVND)}`,
      );
      return;
    }
    setAppliedPromo(promo);
    setPromoError("");
    t.success(`Đã áp dụng mã "${promo.code}"`);
  };

  const handleRemovePromo = () => {
    setAppliedPromo(null);
    setPromoInput("");
    setPromoError("");
    t.info("Đã huỷ mã giảm giá");
  };

  // =========================
  // RENDER
  // =========================
  if (lines.length === 0) {
    return <EmptyCart />;
  }

  return (
    <div className="container-page py-6 md:py-8">
      {/* Breadcrumb */}
      <nav className="text-xs text-ink-muted mb-4 flex items-center gap-2">
        <Link to="/" className="hover:text-primary">
          Trang chủ
        </Link>
        <span>/</span>
        <span className="text-ink">Giỏ hàng</span>
      </nav>

      <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <Badge tone="primary" className="mb-2">
            <IconCart size={14} /> Giỏ hàng của bạn
          </Badge>
          <h1 className="text-2xl md:text-3xl font-bold mb-1">
            Giỏ hàng ({lines.length} sản phẩm)
          </h1>
          <p className="text-sm text-ink-light">
            {totalCount} sản phẩm được chọn · {compactVND(total)} tổng cộng
          </p>
        </div>
        <div className="flex gap-2">
          <Link to="/parts">
            <Button variant="outline" size="sm">
              <IconArrowLeft size={14} />
              Tiếp tục mua sắm
            </Button>
          </Link>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearAll}
            className="text-red-500 hover:text-red-600 hover:bg-red-50"
          >
            <IconTrash size={14} />
            Xoá tất cả
          </Button>
        </div>
      </div>

      <div className="grid lg:grid-cols-[1fr_360px] gap-6">
        {/* ============= LEFT: items list ============= */}
        <div>
          <Card hover={false}>
            {/* Toolbar */}
            <div className="p-4 border-b border-ink/8 flex items-center justify-between flex-wrap gap-2">
              <label className="flex items-center gap-2 cursor-pointer text-sm">
                <input
                  type="checkbox"
                  checked={selectedIds.size === lines.length && lines.length > 0}
                  onChange={toggleSelectAll}
                  className="accent-primary w-4 h-4"
                />
                <span>
                  Chọn tất cả{" "}
                  <span className="text-ink-muted">({lines.length})</span>
                </span>
              </label>
              {selectedIds.size > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRemoveSelected}
                  className="text-red-500 hover:text-red-600 hover:bg-red-50"
                >
                  <IconTrash size={14} />
                  Xoá {selectedIds.size} đã chọn
                </Button>
              )}
            </div>

            {/* Items */}
            <ul className="divide-y divide-ink/8">
              {lines.map((line) => (
                <CartLineItem
                  key={line.part.id}
                  line={line}
                  selected={selectedIds.has(line.part.id)}
                  onToggleSelect={() => toggleSelect(line.part.id)}
                  onQtyChange={(q) => handleQtyChange(line.part.id, q)}
                  onRemove={() => handleRemove(line.part.id, line.part.name)}
                />
              ))}
            </ul>
          </Card>

          {/* Recommended (smart widget) */}
          <RecommendedParts lines={lines} />
        </div>

        {/* ============= RIGHT: sticky summary ============= */}
        <div className="lg:sticky lg:top-20 lg:self-start space-y-4">
          {/* Summary */}
          <Card>
            <div className="p-5">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <IconNote size={18} className="text-primary" />
                Tóm tắt đơn hàng
              </h3>

              <div className="space-y-2 text-sm">
                <SummaryRow
                  label={`Tạm tính (${totalCount} sản phẩm)`}
                  value={compactVND(subtotal)}
                />
                {shipFee > 0 ? (
                  <SummaryRow
                    label="Phí vận chuyển"
                    value={compactVND(shipFee)}
                  />
                ) : (
                  <SummaryRow
                    label="Phí vận chuyển"
                    value="Miễn phí"
                    valueClass="text-accent-hover"
                  />
                )}
                {discount > 0 && (
                  <SummaryRow
                    label={`Giảm giá (${appliedPromo?.code})`}
                    value={`-${compactVND(discount)}`}
                    valueClass="text-accent-hover"
                  />
                )}
              </div>

              <div className="my-4 border-t border-ink/8" />

              <div className="flex items-baseline justify-between">
                <span className="font-semibold">Tổng cộng</span>
                <span className="text-2xl font-bold text-primary">
                  {compactVND(total)}
                </span>
              </div>
              <p className="text-xs text-ink-muted mt-1">
                Đã bao gồm VAT. ({fullVND(total)})
              </p>

              <div className="mt-5 space-y-2">
                <Link to="/checkout" className="block">
                  <Button
                    fullWidth
                    size="lg"
                    disabled={selectedLines.length === 0}
                  >
                    <IconArrowRight size={16} />
                    Thanh toán ({selectedLines.length})
                  </Button>
                </Link>
                <Link to="/parts" className="block">
                  <Button fullWidth size="md" variant="outline">
                    Tiếp tục mua sắm
                  </Button>
                </Link>
              </div>

              {selectedLines.length === 0 && (
                <p className="text-xs text-amber-600 mt-3 text-center">
                  Vui lòng chọn ít nhất 1 sản phẩm để thanh toán
                </p>
              )}
            </div>
          </Card>

          {/* Promo */}
          <Card hover={false} className="bg-bgsoft/40">
            <div className="p-4">
              <h3 className="font-semibold mb-3 flex items-center gap-2 text-sm">
                <IconSale size={16} className="text-primary" />
                Mã giảm giá
              </h3>

              {appliedPromo ? (
                <div className="flex items-center justify-between p-3 rounded-xl bg-accent/30 border border-accent/50">
                  <div className="flex items-center gap-2 min-w-0">
                    <IconCheck size={16} className="text-accent-hover shrink-0" />
                    <div className="min-w-0">
                      <div className="text-sm font-semibold">
                        {appliedPromo.code}
                      </div>
                      <div className="text-xs text-ink-light truncate">
                        {appliedPromo.description}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={handleRemovePromo}
                    className="p-1 rounded-md hover:bg-white/50 text-ink-muted"
                    aria-label="Huỷ mã"
                  >
                    <IconClose size={16} />
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Nhập mã (AUTO10, WELCOME200, FREESHIP)"
                      value={promoInput}
                      onChange={(e) => {
                        setPromoInput(e.target.value);
                        setPromoError("");
                      }}
                      error={promoError}
                      className="flex-1"
                    />
                    <Button onClick={handleApplyPromo} disabled={!promoInput.trim()}>
                      Áp dụng
                    </Button>
                  </div>
                  <div className="mt-3 text-xs text-ink-muted">
                    <p className="font-medium text-ink mb-1">Mã có sẵn:</p>
                    <ul className="space-y-0.5">
                      {PROMOS.map((p) => (
                        <li key={p.code}>
                          <button
                            onClick={() => {
                              setPromoInput(p.code);
                              setPromoError("");
                            }}
                            className="text-primary hover:underline font-mono font-semibold"
                          >
                            {p.code}
                          </button>
                          <span className="text-ink-muted"> — {p.description}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </>
              )}
            </div>
          </Card>

          {/* Trust */}
          <Card hover={false} className="bg-bgsoft/40">
            <div className="p-4 space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <IconShield size={14} className="text-primary" />
                <span className="text-ink-light">Thanh toán an toàn</span>
              </div>
              <div className="flex items-center gap-2">
                <IconPackage size={14} className="text-primary" />
                <span className="text-ink-light">Đổi trả trong 14 ngày</span>
              </div>
              <div className="flex items-center gap-2">
                <IconTag size={14} className="text-primary" />
                <span className="text-ink-light">Cam kết chính hãng 100%</span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

// =========================
// Subcomponents
// =========================

function CartLineItem({
  line,
  selected,
  onToggleSelect,
  onQtyChange,
  onRemove,
}: {
  line: {
    part: Part;
    qty: number;
    lineTotal: number;
  };
  selected: boolean;
  onToggleSelect: () => void;
  onQtyChange: (q: number) => void;
  onRemove: () => void;
}) {
  const { part, qty, lineTotal } = line;
  const discount = getPartDiscountPercent(part);

  return (
    <li className="p-4 flex gap-3 sm:gap-4 items-start">
      {/* Checkbox */}
      <input
        type="checkbox"
        checked={selected}
        onChange={onToggleSelect}
        className="accent-primary w-4 h-4 mt-2 shrink-0"
        aria-label={`Chọn ${part.name}`}
      />

      {/* Image */}
      <Link
        to={`/parts/${part.slug}`}
        className="shrink-0 w-20 h-20 sm:w-24 sm:h-24 rounded-xl overflow-hidden bg-white border border-ink/8"
      >
        <img
          src={part.image}
          alt={part.name}
          className="w-full h-full object-cover"
        />
      </Link>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <Link
              to={`/parts/${part.slug}`}
              className="block font-semibold text-sm sm:text-base leading-snug hover:text-primary transition-colors line-clamp-2"
            >
              {part.name}
            </Link>
            <div className="text-xs text-ink-muted mt-1">
              {part.brand} · {part.category}
            </div>
            <div className="flex items-center gap-1 text-xs text-ink-muted mt-1">
              <IconStar size={12} className="text-accent-hover" />
              <span className="font-medium text-ink">{part.rating}</span>
              <span>({part.reviewsCount})</span>
            </div>
          </div>
          <button
            onClick={onRemove}
            className="p-1.5 rounded-md hover:bg-red-50 text-ink-muted hover:text-red-500 shrink-0"
            aria-label="Xoá"
          >
            <IconTrash size={16} />
          </button>
        </div>

        <div className="mt-2 flex items-end justify-between gap-2 flex-wrap">
          <QtyStepper
            value={qty}
            max={part.stockQty}
            onChange={onQtyChange}
          />
          <div className="text-right">
            <div className="text-primary font-bold text-sm sm:text-base">
              {compactVND(lineTotal)}
            </div>
            {qty > 1 && (
              <div className="text-xs text-ink-muted">
                {compactVND(part.priceVND)} × {qty}
              </div>
            )}
            {discount > 0 && (
              <Badge tone="primary" className="mt-1 text-[10px]">
                -{discount}%
              </Badge>
            )}
          </div>
        </div>
      </div>
    </li>
  );
}

function QtyStepper({
  value,
  max,
  onChange,
}: {
  value: number;
  max: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="inline-flex items-center border border-ink/15 rounded-lg overflow-hidden bg-white">
      <button
        type="button"
        onClick={() => onChange(Math.max(0, value - 1))}
        className="w-8 h-8 flex items-center justify-center text-ink-muted hover:bg-bgsoft disabled:opacity-40"
        aria-label="Giảm"
      >
        −
      </button>
      <input
        type="number"
        value={value}
        min={0}
        max={max}
        onChange={(e) => {
          const n = parseInt(e.target.value, 10);
          if (Number.isNaN(n)) return;
          onChange(Math.max(0, Math.min(n, max)));
        }}
        className="w-12 text-center text-sm font-semibold outline-none bg-transparent"
        aria-label="Số lượng"
      />
      <button
        type="button"
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
        className="w-8 h-8 flex items-center justify-center text-ink-muted hover:bg-bgsoft disabled:opacity-40"
        aria-label="Tăng"
      >
        +
      </button>
    </div>
  );
}

function SummaryRow({
  label,
  value,
  valueClass,
}: {
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-ink-light">{label}</span>
      <span className={`font-medium ${valueClass || "text-ink"}`}>{value}</span>
    </div>
  );
}

function EmptyCart() {
  return (
    <div className="container-page py-6 md:py-8">
      <nav className="text-xs text-ink-muted mb-4 flex items-center gap-2">
        <Link to="/" className="hover:text-primary">
          Trang chủ
        </Link>
        <span>/</span>
        <span className="text-ink">Giỏ hàng</span>
      </nav>
      <Card>
        <div className="p-10 sm:p-16 text-center max-w-md mx-auto">
          <div className="mx-auto w-20 h-20 rounded-2xl bg-bgsoft flex items-center justify-center mb-5">
            <IconCart size={40} className="text-ink-muted" />
          </div>
          <h2 className="text-xl font-bold mb-2">Giỏ hàng của bạn đang trống</h2>
          <p className="text-sm text-ink-light mb-6">
            Khám phá hàng trăm phụ kiện ô tô chính hãng với giá tốt nhất, giao
            hàng nhanh toàn quốc.
          </p>
          <div className="flex flex-col sm:flex-row gap-2 justify-center">
            <Link to="/parts">
              <Button>
                <IconShoppingBag size={16} />
                Khám phá phụ kiện
              </Button>
            </Link>
            <Link to="/">
              <Button variant="outline">Về trang chủ</Button>
            </Link>
          </div>
        </div>
      </Card>
    </div>
  );
}

function RecommendedParts({
  lines,
}: {
  lines: { part: Part; qty: number; lineTotal: number }[];
}) {
  const cartPartIds = useMemo(
    () => new Set(lines.map((l) => l.part.id)),
    [lines],
  );

  // Smart recommendations dựa trên:
  // - Category giống parts trong giỏ
  // - Compatible cars overlap
  // - BestSeller / Featured / Rating
  const recommended = useMemo(
    () => recommendForCart(cartPartIds, 4),
    [cartPartIds],
  );

  if (recommended.length === 0) return null;

  // Lấy category phổ biến nhất trong giỏ → gợi ý subtitle
  const topCategory = useMemo(() => {
    const counts = new Map<string, number>();
    for (const l of lines) {
      counts.set(l.part.category, (counts.get(l.part.category) ?? 0) + 1);
    }
    const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);
    return sorted[0]?.[0];
  }, [lines]);

  return (
    <div className="mt-8">
      <RecommendationWidget
        items={recommended}
        title="Có thể bạn cũng thích"
        subtitle={
          topCategory
            ? `Phụ tùng liên quan đến "${topCategory}" trong giỏ của bạn`
            : "Gợi ý dựa trên lịch sử và sản phẩm phổ biến"
        }
        viewAllHref="/parts"
        viewAllLabel="Khám phá thêm"
      />
    </div>
  );
}
