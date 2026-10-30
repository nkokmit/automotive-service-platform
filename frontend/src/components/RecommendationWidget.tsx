import { Link } from "react-router-dom";
import { useState, type MouseEvent } from "react";
import {
  IconSparkles,
  IconShoppingBag,
  IconCartPlus,
  IconStar,
  IconArrowRight,
} from "./icons";
import Card from "./Card";
import Badge from "./Badge";
import Button from "./Button";
import { useToast } from "./Toast";
import { type ScoredPart } from "../data/recommend";
import {
  formatCompactVND as compactVND,
  getPartDiscountPercent,
  addToCart,
} from "../data/cartStore";

// =========================
// Recommendation widget — hiển thị list parts gợi ý.
// Dùng được ở mọi page: Cart, Checkout, PartDetail, ServiceDetail.
// =========================

export interface RecommendationWidgetProps {
  /** Data đã được score từ recommendation engine */
  items: ScoredPart[];
  /** Tiêu đề widget (mặc định: "Có thể bạn cũng thích") */
  title?: string;
  /** Subtitle nhỏ dưới title */
  subtitle?: string;
  /** Icon đầu title (mặc định: IconSparkles — gợi ý AI) */
  variant?: "default" | "compact";
  /** Có hiển thị nút "Thêm vào giỏ" trên mỗi card không (mặc định: true) */
  showAddToCart?: boolean;
  /** Có hiển thị rating không (mặc định: true) */
  showRating?: boolean;
  /** "Xem tất cả" link — nếu có sẽ hiển thị */
  viewAllHref?: string;
  /** "Xem tất cả" label */
  viewAllLabel?: string;
  /** Empty state custom message */
  emptyMessage?: string;
}

export default function RecommendationWidget({
  items,
  title = "Có thể bạn cũng thích",
  subtitle,
  variant = "default",
  showAddToCart = true,
  showRating = true,
  viewAllHref = "/parts",
  viewAllLabel = "Xem tất cả",
  emptyMessage = "Chưa có gợi ý phù hợp.",
}: RecommendationWidgetProps) {
  const isCompact = variant === "compact";

  if (items.length === 0) {
    return (
      <div className={isCompact ? "mt-4" : "mt-8"}>
        <SectionHeader
          title={title}
          subtitle={subtitle}
          viewAllHref={viewAllHref}
          viewAllLabel={viewAllLabel}
        />
        <Card hover={false}>
          <div className="p-8 text-center text-sm text-ink-muted">
            {emptyMessage}
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className={isCompact ? "mt-4" : "mt-8"}>
      <SectionHeader
        title={title}
        subtitle={subtitle}
        viewAllHref={viewAllHref}
        viewAllLabel={viewAllLabel}
      />
      <div
        className={[
          "grid gap-3 sm:gap-4",
          isCompact
            ? "grid-cols-2 sm:grid-cols-4"
            : "grid-cols-2 lg:grid-cols-4",
        ].join(" ")}
      >
        {items.map((item) => (
          <RecommendationCard
            key={item.part.id}
            scored={item}
            showAddToCart={showAddToCart}
            showRating={showRating}
            compact={isCompact}
          />
        ))}
      </div>
    </div>
  );
}

// =========================
// Subcomponents
// =========================

function SectionHeader({
  title,
  subtitle,
  viewAllHref,
  viewAllLabel,
}: {
  title: string;
  subtitle?: string;
  viewAllHref?: string;
  viewAllLabel?: string;
}) {
  return (
    <div className="mb-4 flex items-end justify-between gap-3 flex-wrap">
      <div className="min-w-0">
        <h2 className="text-lg md:text-xl font-bold flex items-center gap-2">
          <span className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
            <IconSparkles size={14} />
          </span>
          <span className="truncate">{title}</span>
        </h2>
        {subtitle && (
          <p className="text-xs text-ink-muted mt-0.5 ml-9">{subtitle}</p>
        )}
      </div>
      {viewAllHref && (
        <Link
          to={viewAllHref}
          className="text-sm font-medium text-primary hover:underline inline-flex items-center gap-1 shrink-0"
        >
          {viewAllLabel}
          <IconArrowRight size={14} />
        </Link>
      )}
    </div>
  );
}

function RecommendationCard({
  scored,
  showAddToCart,
  showRating,
  compact,
}: {
  scored: ScoredPart;
  showAddToCart: boolean;
  showRating: boolean;
  compact: boolean;
}) {
  const { part, reasons } = scored;
  const t = useToast();
  const [justAdded, setJustAdded] = useState(false);
  const discount = getPartDiscountPercent(part);

  const handleAddToCart = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addToCart(part.id, 1);
    setJustAdded(true);
    t.success(`Đã thêm "${part.name}" vào giỏ hàng`);
    setTimeout(() => setJustAdded(false), 1500);
  };

  // Lấy reason chính (đầu tiên) làm badge
  const mainReason = reasons[0];

  return (
    <Link to={`/parts/${part.slug}`} className="group block">
      <Card className="h-full overflow-hidden">
        {/* Image */}
        <div className="relative aspect-square overflow-hidden rounded-t-2xl bg-white">
          <img
            src={part.image}
            alt={part.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />
          {/* Badges top-left */}
          <div className="absolute top-1.5 left-1.5 flex flex-col gap-1">
            {discount > 0 && (
              <Badge tone="primary" className="text-[10px]">
                -{discount}%
              </Badge>
            )}
            {part.isBestSeller && (
              <Badge tone="accent" className="text-[10px]">
                Bán chạy
              </Badge>
            )}
          </div>
          {/* Reason badge top-right (chỉ khi có reason) */}
          {mainReason && (
            <div className="absolute top-1.5 right-1.5">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/95 backdrop-blur text-[10px] font-semibold text-primary border border-primary/20">
                <IconSparkles size={9} />
                <span className="line-clamp-1 max-w-[120px]">{mainReason}</span>
              </span>
            </div>
          )}
        </div>

        {/* Info */}
        <div className="p-2.5 sm:p-3">
          <div className="text-[10px] uppercase tracking-wide text-ink-muted mb-0.5">
            {part.brand}
          </div>
          <h4 className="font-semibold text-xs sm:text-sm leading-tight mb-1.5 line-clamp-2 min-h-[2.4rem] group-hover:text-primary transition-colors">
            {part.name}
          </h4>

          {showRating && (
            <div className="flex items-center gap-1 text-[10px] text-ink-muted mb-1.5">
              <IconStar size={10} className="text-accent-hover" />
              <span className="font-semibold text-ink">{part.rating}</span>
              <span>({part.reviewsCount})</span>
            </div>
          )}

          <div className="flex items-baseline justify-between gap-2 mb-2">
            <div className="text-primary font-bold text-sm">
              {compactVND(part.priceVND)}
            </div>
            {part.originalPriceVND && discount > 0 && (
              <div className="text-[10px] text-ink-muted line-through">
                {compactVND(part.originalPriceVND)}
              </div>
            )}
          </div>

          {showAddToCart && (
            <Button
              variant={justAdded ? "secondary" : "outline"}
              size="sm"
              fullWidth
              onClick={handleAddToCart}
              className="text-[11px] h-8"
            >
              {justAdded ? (
                <>
                  <IconShoppingBag size={12} />
                  Đã thêm
                </>
              ) : (
                <>
                  <IconCartPlus size={12} />
                  Thêm vào giỏ
                </>
              )}
            </Button>
          )}
        </div>
      </Card>
    </Link>
  );
}